import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { API_BASE_URL, ApiRequestError, fetchJson, getUserFacingApiErrorMessage, postJson } from "./src/lib/api";
import { mobileConfig } from "./src/lib/config";
import { registerSubmissionUploadBackgroundTask } from "./src/lib/submission-upload-worker";
import { hasSupabaseMobileConfig, supabase } from "./src/lib/supabase";
import { mobileTheme } from "./src/theme/mobile";

type MobileMissionListItem = {
  slug: string;
  title: string;
  brand: string;
  points: number;
  difficulty: string;
  requiredLevel: number;
  eta: string;
  category: string;
  imageUrl: string | null;
  minParticipants: number;
  currentParticipants: number;
};

type MobileMissionDetail = {
  slug: string;
  title: string;
  brand: string;
  product: string;
  points: number;
  difficulty: string;
  requiredLevel: number;
  eta: string;
  category: string;
  description: string;
  hook: string;
  requirements: string[];
  deliverables: string[];
  tags: string[];
  imageUrl: string | null;
  minParticipants: number;
  currentParticipants: number;
};

type MobileMeResponse = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    instagramHandle: string | null;
    niche: string | null;
    followersRange: string | null;
    balance: number;
    approvedMissionCount: number;
    userLevel: number;
  };
};

type MobileSubmissionResponse = {
  id: string;
};

type MobileSubmissionTimelineEvent = {
  key: string;
  label: string;
  at: string;
  tone: "neutral" | "success" | "danger";
};

type MobileSubmissionHistoryItem = {
  id: string;
  missionSlug: string;
  missionTitle: string;
  missionBrand: string;
  rewardCoins: number;
  status: string;
  reelUrl: string;
  captionSummary: string | null;
  notes: string | null;
  reviewedBy: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewDueAt: string | null;
  timeline: MobileSubmissionTimelineEvent[];
};

type MobileSubmissionHistoryResponse = {
  submissions: MobileSubmissionHistoryItem[];
  pagination?: {
    limit: number;
    total: number | null;
    includeTotal?: boolean;
    hasMore: boolean;
    nextCursor: string | null;
  };
  filters?: {
    status: string | null;
    q: string | null;
  };
};

type SubmissionQueueStatus = "queued" | "uploading" | "retrying" | "failed" | "completed";

type MobileSubmissionMediaAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileChecksumMd5: string;
};

type MobileUploadSessionState = {
  uploadId: string | null;
  filePath: string | null;
  fileUrl: string | null;
  uploadedBytes: number;
  uploadedParts: number[];
  totalParts: number;
  chunkSize: number;
};

type MobileSubmissionQueueItem = {
  localId: string;
  idempotencyKey: string;
  missionSlug: string;
  missionTitle: string;
  reelUrl: string;
  captionSummary: string;
  notes: string;
  checks: {
    published: boolean;
    taggedBrand: boolean;
    addedCollaborator: boolean;
  };
  mediaAsset: MobileSubmissionMediaAsset | null;
  uploadSession: MobileUploadSessionState | null;
  status: SubmissionQueueStatus;
  progress: number;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: string | null;
  lastError: string | null;
  serverSubmissionId: string | null;
};

type SubmissionQueueCachePayload = {
  storedAt: number;
  items: MobileSubmissionQueueItem[];
};

type MobileUploadCreateSessionResponse = {
  uploadId: string;
  chunkSize: number;
  totalParts: number;
  uploadedParts: number[];
  uploadedBytes: number;
};

type MobileUploadSessionStatusResponse = {
  uploadId: string;
  chunkSize: number;
  totalParts: number;
  fileSize: number;
  fileName: string;
  mimeType: string;
  uploadedParts: number[];
  uploadedBytes: number;
};

type MobileUploadPartResponse = {
  ok: boolean;
  partNumber: number;
  bytes: number;
};

type MobileUploadCompleteResponse = {
  uploadId: string;
  filePath: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

const HISTORY_PAGE_SIZE = 6;
const HISTORY_CACHE_VERSION = 1;
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const HISTORY_STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected"] as const;
const MISSION_CACHE_VERSION = 1;
const MISSION_CACHE_TTL_MS = 15 * 60 * 1000;
const MISSION_ZONE_FILTERS = ["Easy", "Medium", "Hard"] as const;
const SUBMISSION_QUEUE_VERSION = 1;
const SUBMISSION_QUEUE_MAX_ATTEMPTS = 6;
const SUBMISSION_QUEUE_RETRY_BASE_MS = 2_000;
const SUBMISSION_QUEUE_RETRY_MAX_MS = 2 * 60 * 1000;

type MissionZone = (typeof MISSION_ZONE_FILTERS)[number];

const DIFFICULTY_REQUIRED_LEVEL: Record<MissionZone, number> = {
  Easy: 1,
  Medium: 10,
  Hard: 20,
};

function getHistoryCacheKey(userId: string, statusFilter: string, searchQuery: string) {
  const normalizedStatus = statusFilter.trim().toLowerCase() || "all";
  const normalizedQuery = searchQuery.trim().toLowerCase() || "none";
  return `mobile:submission-history:v${HISTORY_CACHE_VERSION}:${userId}:${normalizedStatus}:${normalizedQuery}`;
}

function getHistoryCachePrefix(userId: string) {
  return `mobile:submission-history:v${HISTORY_CACHE_VERSION}:${userId}:`;
}

function getMissionCacheKey() {
  return `mobile:missions:v${MISSION_CACHE_VERSION}`;
}

function getSubmissionQueueKey(userId: string) {
  return `mobile:submission-queue:v${SUBMISSION_QUEUE_VERSION}:${userId}`;
}

function normalizeMissionZone(raw: string): MissionZone {
  if (raw === "Medium") {
    return "Medium";
  }

  if (raw === "Hard") {
    return "Hard";
  }

  return "Easy";
}

function canAccessMissionZone(userLevel: number, zone: MissionZone) {
  return userLevel >= DIFFICULTY_REQUIRED_LEVEL[zone];
}

function buildHistoryQuery(
  statusFilter: (typeof HISTORY_STATUS_FILTERS)[number],
  searchQuery: string,
  limit: number,
  cursor: string | null,
  includeTotal: boolean,
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", cursor);
  }
  if (statusFilter !== "All") {
    params.set("status", statusFilter.toLowerCase());
  }

  const query = searchQuery.trim();
  if (query) {
    params.set("q", query);
  }

  if (includeTotal) {
    params.set("includeTotal", "1");
  }

  return `/api/mobile/submissions?${params.toString()}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "approved") {
    return styles.statusSuccess;
  }

  if (normalized === "rejected") {
    return styles.statusDanger;
  }

  return styles.statusNeutral;
}

function getTimelineToneStyle(tone: MobileSubmissionTimelineEvent["tone"]) {
  if (tone === "success") {
    return styles.timelineSuccess;
  }

  if (tone === "danger") {
    return styles.timelineDanger;
  }

  return styles.timelineNeutral;
}

function createIdempotencyKey(namespace: string, slug?: string) {
  const normalizedSlug = slug?.trim() || "na";
  return `${namespace}:${normalizedSlug}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function getQueueStatusLabel(status: SubmissionQueueStatus) {
  if (status === "uploading") {
    return "Uploading";
  }

  if (status === "retrying") {
    return "Retrying";
  }

  if (status === "failed") {
    return "Failed";
  }

  if (status === "completed") {
    return "Completed";
  }

  return "Queued";
}

function getQueueRetryDelayMs(attempts: number) {
  const raw = SUBMISSION_QUEUE_RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1);
  return Math.min(raw, SUBMISSION_QUEUE_RETRY_MAX_MS);
}

function shouldRetryQueueError(error: ApiRequestError) {
  return error.isNetworkError || error.status === 409 || error.status === 429 || error.status >= 500;
}

function toDisplayErrorMessage(error: unknown, fallbackMessage: string) {
  return getUserFacingApiErrorMessage(error, fallbackMessage);
}

function reportApiErrorDiagnostics(error: unknown, scope: string) {
  if (!(error instanceof ApiRequestError)) {
    return;
  }

  console.info("[mobile-api-error]", {
    scope,
    code: error.code,
    status: error.status,
    path: error.path,
    method: error.method,
    attempt: error.attempt,
    maxAttempts: error.maxAttempts,
    retryDelaysMs: error.retryDelaysMs,
    retryable: error.retryable,
    requestId: error.requestId,
  });
}

function formatRetryCountdown(nextRetryAt: string | null) {
  if (!nextRetryAt) {
    return null;
  }

  const retryAtMs = Date.parse(nextRetryAt);
  if (Number.isNaN(retryAtMs)) {
    return null;
  }

  const remainingMs = retryAtMs - Date.now();
  if (remainingMs <= 0) {
    return "Retrying now";
  }

  const seconds = Math.ceil(remainingMs / 1000);
  return `Retry in ${seconds}s`;
}

function formatBytes(totalBytes: number) {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return "0 B";
  }

  if (totalBytes < 1024) {
    return `${Math.round(totalBytes)} B`;
  }

  if (totalBytes < 1024 * 1024) {
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  }

  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getUploadedBytesFromParts(
  uploadedParts: number[],
  totalParts: number,
  chunkSize: number,
  fileSize: number,
) {
  if (uploadedParts.length === 0 || totalParts <= 0 || chunkSize <= 0 || fileSize <= 0) {
    return 0;
  }

  const uniqueParts = Array.from(new Set(uploadedParts)).filter((part) => part >= 0 && part < totalParts);
  const lastPart = totalParts - 1;
  const fullChunkCount = uniqueParts.filter((part) => part !== lastPart).length;
  const hasLastPart = uniqueParts.includes(lastPart);
  const lastChunkSize = Math.max(0, fileSize - (chunkSize * (totalParts - 1)));
  const uploadedBytes = (fullChunkCount * chunkSize) + (hasLastPart ? lastChunkSize : 0);

  return Math.min(fileSize, Math.max(0, uploadedBytes));
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MobileMeResponse["user"] | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [missions, setMissions] = useState<MobileMissionListItem[]>([]);
  const [selectedZone, setSelectedZone] = useState<MissionZone>("Easy");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<MobileMissionDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submissionReelUrl, setSubmissionReelUrl] = useState("");
  const [submissionMediaAsset, setSubmissionMediaAsset] = useState<MobileSubmissionMediaAsset | null>(null);
  const [submissionCaptionSummary, setSubmissionCaptionSummary] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionChecks, setSubmissionChecks] = useState({
    published: true,
    taggedBrand: false,
    addedCollaborator: false,
  });
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submissionQueue, setSubmissionQueue] = useState<MobileSubmissionQueueItem[]>([]);
  const [submissionQueueHydrated, setSubmissionQueueHydrated] = useState(false);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [queueClockMs, setQueueClockMs] = useState(0);
  const [submissionHistory, setSubmissionHistory] = useState<MobileSubmissionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<(typeof HISTORY_STATUS_FILTERS)[number]>("All");
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyCacheHydrated, setHistoryCacheHydrated] = useState(false);
  const [shouldIncludeTotalOnNextHead, setShouldIncludeTotalOnNextHead] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queueProcessingLocalIdRef = useRef<string | null>(null);
  const profileId = profile?.id ?? null;
  const userLevel = profile?.userLevel ?? 1;

  const selectedItem = useMemo(
    () => missions.find((item) => item.slug === selectedSlug) ?? null,
    [missions, selectedSlug],
  );

  const filteredMissions = useMemo(
    () => missions.filter((item) => normalizeMissionZone(item.difficulty) === selectedZone),
    [missions, selectedZone],
  );

  const isSelectedMissionLocked = useMemo(() => {
    if (!selectedMission) {
      return false;
    }

    return userLevel < selectedMission.requiredLevel;
  }, [selectedMission, userLevel]);

  const canSubmit = useMemo(() => {
    const hasUrl = submissionReelUrl.trim().startsWith("http");
    const hasMedia = Boolean(submissionMediaAsset?.uri);
    return Boolean(
      accessToken
      && selectedMission
      && !isSelectedMissionLocked
      && (hasUrl || hasMedia)
      && submissionChecks.addedCollaborator,
    );
  }, [
    accessToken,
    isSelectedMissionLocked,
    selectedMission,
    submissionChecks.addedCollaborator,
    submissionMediaAsset,
    submissionReelUrl,
  ]);

  const pendingQueueCount = useMemo(() => {
    return submissionQueue.filter((item) => item.status === "queued" || item.status === "uploading" || item.status === "retrying").length;
  }, [submissionQueue]);

  const displaySubmissionQueue = useMemo(() => {
    return [...submissionQueue]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 8);
  }, [submissionQueue]);

  const applyMissionSnapshot = useCallback((snapshot: MobileMissionListItem[]) => {
    setMissions(snapshot);

    const zoneMissions = snapshot.filter((item) => normalizeMissionZone(item.difficulty) === selectedZone);
    if (zoneMissions.length === 0) {
      setSelectedSlug(null);
      setSelectedMission(null);
      return;
    }

    const stillSelected = selectedSlug && zoneMissions.some((item) => item.slug === selectedSlug);
    if (!stillSelected) {
      setSelectedSlug(zoneMissions[0].slug);
    }
  }, [selectedSlug, selectedZone]);

  const loadMissions = useCallback(async () => {
    setLoadingList(true);
    setListError(null);

    try {
      const data = await fetchJson<{ missions: MobileMissionListItem[] }>("/api/mobile/missions");
      applyMissionSnapshot(data.missions);

      try {
        await AsyncStorage.setItem(getMissionCacheKey(), JSON.stringify({
          storedAt: Date.now(),
          missions: data.missions,
        }));
      } catch {
        // Cache failure should not block fresh data render.
      }
    } catch (requestError) {
      reportApiErrorDiagnostics(requestError, "loadMissions");
      setListError(toDisplayErrorMessage(requestError, "Unable to load missions."));

      try {
        const raw = await AsyncStorage.getItem(getMissionCacheKey());
        if (raw) {
          const parsed = JSON.parse(raw) as { storedAt?: number; missions?: MobileMissionListItem[] };
          const cached = Array.isArray(parsed.missions) ? parsed.missions : [];
          if (cached.length > 0 && parsed.storedAt && Date.now() - parsed.storedAt <= MISSION_CACHE_TTL_MS) {
            applyMissionSnapshot(cached);
            setListError("Network is unstable. Loaded cached missions.");
          } else {
            setMissions([]);
            setSelectedSlug(null);
            setSelectedMission(null);
          }
        } else {
          setMissions([]);
          setSelectedSlug(null);
          setSelectedMission(null);
        }
      } catch {
        setMissions([]);
        setSelectedSlug(null);
        setSelectedMission(null);
      }
    } finally {
      setLoadingList(false);
    }
  }, [applyMissionSnapshot]);

  const loadMissionDetail = useCallback(async (slug: string) => {
    setLoadingDetail(true);
    setDetailError(null);

    try {
      const data = await fetchJson<{ mission: MobileMissionDetail }>(`/api/mobile/missions/${slug}`);
      setSelectedMission(data.mission);
    } catch (requestError) {
      reportApiErrorDiagnostics(requestError, "loadMissionDetail");
      setDetailError(toDisplayErrorMessage(requestError, "Unable to load mission detail."));
      setSelectedMission(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const resetSubmissionState = useCallback(() => {
    setSubmissionReelUrl("");
    setSubmissionMediaAsset(null);
    setSubmissionCaptionSummary("");
    setSubmissionNotes("");
    setSubmissionChecks({
      published: true,
      taggedBrand: false,
      addedCollaborator: false,
    });
    setSubmissionBusy(false);
    setSubmissionError(null);
    setSubmissionId(null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadMissions();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadMissions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldIncludeTotalOnNextHead(true);
      setHistorySearchQuery(historySearchInput.trim());
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [historySearchInput]);

  const loadProfile = useCallback(async (token: string) => {
    const data = await fetchJson<MobileMeResponse>("/api/mobile/me", token);
    setProfile(data.user);
  }, []);

  const syncServerSession = useCallback(async (accessTokenValue: string, refreshTokenValue?: string | null) => {
    await postJson<{ ok: boolean }>("/api/auth/session", {
      access_token: accessTokenValue,
      refresh_token: refreshTokenValue ?? null,
    });
  }, []);

  const loadSubmissionHistory = useCallback(async (
    token: string,
    options?: {
      append?: boolean;
      cursor?: string | null;
      statusFilter?: (typeof HISTORY_STATUS_FILTERS)[number];
      searchQuery?: string;
      includeTotalOverride?: boolean;
    },
  ) => {
    const append = options?.append ?? false;
    const cursor = options?.cursor ?? null;
    const statusFilter = options?.statusFilter ?? historyStatusFilter;
    const searchQuery = options?.searchQuery ?? historySearchQuery;
    const includeTotal = options?.includeTotalOverride
      ?? (!append && !cursor && shouldIncludeTotalOnNextHead);

    if (append) {
      setLoadingMoreHistory(true);
    } else {
      setLoadingHistory(true);
      setHistoryError(null);
    }

    try {
      const data = await fetchJson<MobileSubmissionHistoryResponse>(
        buildHistoryQuery(statusFilter, searchQuery, HISTORY_PAGE_SIZE, cursor, includeTotal),
        token,
      );

      const incoming = data.submissions ?? [];
      if (append) {
        setSubmissionHistory((current) => {
          const byId = new Map(current.map((item) => [item.id, item]));
          incoming.forEach((item) => {
            byId.set(item.id, item);
          });
          return Array.from(byId.values());
        });
      } else {
        setSubmissionHistory(incoming);
      }

      const nextCursor = data.pagination?.nextCursor ?? null;
      const hasMore = data.pagination?.hasMore ?? incoming.length === HISTORY_PAGE_SIZE;
      setHistoryCursor(nextCursor);
      setHistoryHasMore(hasMore);
      setHistoryError(null);
      if (!append && !cursor && includeTotal) {
        setShouldIncludeTotalOnNextHead(false);
      }
    } catch (requestError) {
      reportApiErrorDiagnostics(requestError, "loadSubmissionHistory");
      setHistoryError(toDisplayErrorMessage(requestError, "Unable to load submission history."));
      if (!append) {
        setSubmissionHistory([]);
        setHistoryCursor(null);
        setHistoryHasMore(false);
      }
    } finally {
      if (append) {
        setLoadingMoreHistory(false);
      } else {
        setLoadingHistory(false);
      }
    }
  }, [historySearchQuery, historyStatusFilter, shouldIncludeTotalOnNextHead]);

  const hydrateHistoryFromCache = useCallback(async (
    userId: string,
    statusFilter: (typeof HISTORY_STATUS_FILTERS)[number],
    searchQuery: string,
  ) => {
    try {
      const key = getHistoryCacheKey(userId, statusFilter, searchQuery);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        storedAt?: number;
        submissions?: MobileSubmissionHistoryItem[];
        historyCursor?: string | null;
        historyHasMore?: boolean;
      };

      if (!parsed.storedAt || Date.now() - parsed.storedAt > HISTORY_CACHE_TTL_MS) {
        await AsyncStorage.removeItem(key);
        return;
      }

      const cachedSubmissions = Array.isArray(parsed.submissions) ? parsed.submissions : [];
      setSubmissionHistory(cachedSubmissions);
      setHistoryCursor(typeof parsed.historyCursor === "string" ? parsed.historyCursor : null);
      setHistoryHasMore(Boolean(parsed.historyHasMore));
    } catch {
      // Ignore malformed cache and fall back to network.
    } finally {
      setHistoryCacheHydrated(true);
    }
  }, []);

  const persistHistoryToCache = useCallback(async (
    userId: string,
    statusFilter: (typeof HISTORY_STATUS_FILTERS)[number],
    searchQuery: string,
    payload: {
      submissions: MobileSubmissionHistoryItem[];
      historyCursor: string | null;
      historyHasMore: boolean;
    },
  ) => {
    try {
      const key = getHistoryCacheKey(userId, statusFilter, searchQuery);
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          ...payload,
          storedAt: Date.now(),
        }),
      );
    } catch {
      // Cache failures should not block UI.
    }
  }, []);

  const clearHistoryCacheForUser = useCallback(async (userId: string) => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const prefix = getHistoryCachePrefix(userId);
      const removable = keys.filter((key) => key.startsWith(prefix));
      if (removable.length > 0) {
        await AsyncStorage.multiRemove(removable);
      }
    } catch {
      // Ignore cache clear failures.
    }
  }, []);

  const hydrateSubmissionQueueForUser = useCallback(async (userId: string) => {
    try {
      const raw = await AsyncStorage.getItem(getSubmissionQueueKey(userId));
      if (!raw) {
        setSubmissionQueue([]);
        return;
      }

      const parsed = JSON.parse(raw) as SubmissionQueueCachePayload;
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const normalized = items.map((item) => {
        const normalizedStatus = item.status === "uploading" ? "retrying" : item.status;
        const defaultRetryAt = normalizedStatus === "retrying" ? new Date().toISOString() : null;
        return {
          ...item,
          status: normalizedStatus,
          progress: item.status === "completed" ? 100 : Math.max(0, Math.min(100, Number(item.progress) || 0)),
          attempts: Math.max(0, Number(item.attempts) || 0),
          nextRetryAt: normalizedStatus === "retrying"
            ? (item.nextRetryAt && !Number.isNaN(Date.parse(item.nextRetryAt)) ? item.nextRetryAt : defaultRetryAt)
            : null,
          updatedAt: item.updatedAt || new Date().toISOString(),
          createdAt: item.createdAt || new Date().toISOString(),
          lastError: item.lastError ?? null,
          serverSubmissionId: item.serverSubmissionId ?? null,
          mediaAsset: item.mediaAsset && typeof item.mediaAsset === "object"
            ? {
              uri: String(item.mediaAsset.uri ?? ""),
              fileName: String(item.mediaAsset.fileName ?? "proof-media"),
              mimeType: String(item.mediaAsset.mimeType ?? "application/octet-stream"),
              fileSize: Math.max(0, Number(item.mediaAsset.fileSize) || 0),
                  fileChecksumMd5: String(item.mediaAsset.fileChecksumMd5 ?? "").toLowerCase(),
            }
            : null,
          uploadSession: item.uploadSession && typeof item.uploadSession === "object"
            ? {
              uploadId: typeof item.uploadSession.uploadId === "string" ? item.uploadSession.uploadId : null,
              filePath: typeof item.uploadSession.filePath === "string" ? item.uploadSession.filePath : null,
              fileUrl: typeof item.uploadSession.fileUrl === "string" ? item.uploadSession.fileUrl : null,
              uploadedBytes: Math.max(0, Number(item.uploadSession.uploadedBytes) || 0),
              uploadedParts: Array.isArray(item.uploadSession.uploadedParts)
                ? item.uploadSession.uploadedParts
                  .map((part) => Number(part))
                  .filter((part) => Number.isInteger(part) && part >= 0)
                : [],
              totalParts: Math.max(1, Number(item.uploadSession.totalParts) || 1),
              chunkSize: Math.max(1, Number(item.uploadSession.chunkSize) || 512 * 1024),
            }
            : null,
        } as MobileSubmissionQueueItem;
      });

      setSubmissionQueue(normalized);
    } catch {
      setSubmissionQueue([]);
    } finally {
      setSubmissionQueueHydrated(true);
    }
  }, []);

  const queueSubmissionFromCurrentForm = useCallback(() => {
    if (!selectedMission) {
      return;
    }

    const nowIso = new Date().toISOString();
    const queuedItem: MobileSubmissionQueueItem = {
      localId: createIdempotencyKey("mobile-queue", selectedMission.slug),
      idempotencyKey: createIdempotencyKey("mobile-submission", selectedMission.slug),
      missionSlug: selectedMission.slug,
      missionTitle: selectedMission.title,
      reelUrl: submissionReelUrl.trim(),
      captionSummary: submissionCaptionSummary,
      notes: submissionNotes,
      checks: submissionChecks,
      mediaAsset: submissionMediaAsset,
      uploadSession: submissionMediaAsset
        ? {
          uploadId: null,
          filePath: null,
          fileUrl: null,
          uploadedBytes: 0,
          uploadedParts: [],
          totalParts: Math.max(1, Math.ceil(submissionMediaAsset.fileSize / (512 * 1024))),
          chunkSize: 512 * 1024,
        }
        : null,
      status: "queued",
      progress: 0,
      attempts: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      nextRetryAt: null,
      lastError: null,
      serverSubmissionId: null,
    };

    setSubmissionQueue((current) => [...current, queuedItem]);
    setQueueNotice(`Queued proof upload for ${selectedMission.title}.`);
  }, [selectedMission, submissionCaptionSummary, submissionChecks, submissionMediaAsset, submissionNotes, submissionReelUrl]);

  const processQueuedSubmission = useCallback(async (item: MobileSubmissionQueueItem, token: string) => {
    if (queueProcessingLocalIdRef.current) {
      return;
    }

    queueProcessingLocalIdRef.current = item.localId;
    setSubmissionQueue((current) => current.map((queueItem) => {
      if (queueItem.localId !== item.localId) {
        return queueItem;
      }

      return {
        ...queueItem,
        status: "uploading",
        attempts: queueItem.attempts + 1,
        progress: Math.max(queueItem.progress, 1),
        updatedAt: new Date().toISOString(),
        nextRetryAt: null,
        lastError: null,
      };
    }));

    try {
      const setQueueItem = (updater: (queueItem: MobileSubmissionQueueItem) => MobileSubmissionQueueItem) => {
        setSubmissionQueue((current) => current.map((queueItem) => {
          if (queueItem.localId !== item.localId) {
            return queueItem;
          }

          return updater(queueItem);
        }));
      };

      let reelUrlForSubmission = item.reelUrl.trim();

      if (item.mediaAsset) {
        const media = item.mediaAsset;
        let mediaChecksumMd5 = media.fileChecksumMd5?.toLowerCase();
        if (!/^[a-f0-9]{32}$/.test(mediaChecksumMd5 ?? "")) {
          const info = await LegacyFileSystem.getInfoAsync(media.uri, { md5: true });
          mediaChecksumMd5 = info.exists && typeof info.md5 === "string" ? info.md5.toLowerCase() : "";
          if (!/^[a-f0-9]{32}$/.test(mediaChecksumMd5)) {
            throw new Error("Unable to compute file checksum for upload integrity.");
          }

          setQueueItem((queueItem) => ({
            ...queueItem,
            mediaAsset: queueItem.mediaAsset
              ? {
                ...queueItem.mediaAsset,
                fileChecksumMd5: mediaChecksumMd5,
              }
              : null,
          }));
        }

        let uploadSession = item.uploadSession;
        if (!uploadSession?.uploadId) {
          const createdSession = await postJson<MobileUploadCreateSessionResponse>(
            "/api/mobile/uploads/sessions",
            {
              fileName: media.fileName,
              mimeType: media.mimeType,
              fileSize: media.fileSize,
              missionSlug: item.missionSlug,
              fileChecksumMd5: mediaChecksumMd5,
            },
            token,
          );

          uploadSession = {
            uploadId: createdSession.uploadId,
            filePath: null,
            fileUrl: null,
            uploadedBytes: createdSession.uploadedBytes,
            uploadedParts: createdSession.uploadedParts,
            totalParts: createdSession.totalParts,
            chunkSize: createdSession.chunkSize,
          };

          const initialProgress = Math.round((uploadSession.uploadedBytes / Math.max(media.fileSize, 1)) * 100);
          setQueueItem((queueItem) => ({
            ...queueItem,
            uploadSession,
            progress: Math.max(queueItem.progress, initialProgress),
            updatedAt: new Date().toISOString(),
          }));
        }

        let sessionStatus: MobileUploadSessionStatusResponse;
        try {
          sessionStatus = await fetchJson<MobileUploadSessionStatusResponse>(
            `/api/mobile/uploads/sessions/${uploadSession.uploadId}`,
            token,
          );
        } catch (requestError) {
          if (!(requestError instanceof ApiRequestError) || requestError.status !== 404) {
            throw requestError;
          }

          const recreatedSession = await postJson<MobileUploadCreateSessionResponse>(
            "/api/mobile/uploads/sessions",
            {
              fileName: media.fileName,
              mimeType: media.mimeType,
              fileSize: media.fileSize,
              missionSlug: item.missionSlug,
              fileChecksumMd5: mediaChecksumMd5,
            },
            token,
          );

          sessionStatus = {
            uploadId: recreatedSession.uploadId,
            chunkSize: recreatedSession.chunkSize,
            totalParts: recreatedSession.totalParts,
            fileSize: media.fileSize,
            fileName: media.fileName,
            mimeType: media.mimeType,
            uploadedParts: recreatedSession.uploadedParts,
            uploadedBytes: recreatedSession.uploadedBytes,
          };
        }

        const uploadedPartsSet = new Set(sessionStatus.uploadedParts);
        const totalParts = sessionStatus.totalParts;
        const chunkSize = sessionStatus.chunkSize;

        setQueueItem((queueItem) => ({
          ...queueItem,
          uploadSession: {
            uploadId: sessionStatus.uploadId,
            filePath: queueItem.uploadSession?.filePath ?? null,
            fileUrl: queueItem.uploadSession?.fileUrl ?? null,
            uploadedBytes: Math.min(sessionStatus.uploadedBytes, media.fileSize),
            uploadedParts: Array.from(uploadedPartsSet).sort((left, right) => left - right),
            totalParts,
            chunkSize,
          },
          progress: Math.min(100, Math.round((Math.min(sessionStatus.uploadedBytes, media.fileSize) / Math.max(media.fileSize, 1)) * 100)),
          updatedAt: new Date().toISOString(),
        }));

        for (let partNumber = 0; partNumber < totalParts; partNumber += 1) {
          if (uploadedPartsSet.has(partNumber)) {
            continue;
          }

          const partStart = partNumber * chunkSize;
          const partLength = Math.min(chunkSize, Math.max(0, media.fileSize - partStart));
          if (partLength <= 0) {
            continue;
          }

          const chunkBase64 = await LegacyFileSystem.readAsStringAsync(media.uri, {
            encoding: LegacyFileSystem.EncodingType.Base64,
            position: partStart,
            length: partLength,
          });

          await postJson<MobileUploadPartResponse>(
            `/api/mobile/uploads/sessions/${sessionStatus.uploadId}/parts/${partNumber}`,
            {
              chunkBase64,
            },
            token,
          );

          uploadedPartsSet.add(partNumber);
          const uploadedParts = Array.from(uploadedPartsSet).sort((left, right) => left - right);
          const uploadedBytes = getUploadedBytesFromParts(uploadedParts, totalParts, chunkSize, media.fileSize);
          const progress = Math.min(100, Math.round((uploadedBytes / Math.max(media.fileSize, 1)) * 100));

          setQueueItem((queueItem) => ({
            ...queueItem,
            uploadSession: {
              uploadId: sessionStatus.uploadId,
              filePath: queueItem.uploadSession?.filePath ?? null,
              fileUrl: queueItem.uploadSession?.fileUrl ?? null,
              uploadedBytes,
              uploadedParts,
              totalParts,
              chunkSize,
            },
            progress,
            updatedAt: new Date().toISOString(),
          }));
        }

        const completedUpload = await postJson<MobileUploadCompleteResponse>(
          `/api/mobile/uploads/sessions/${sessionStatus.uploadId}/complete`,
          {},
          token,
        );

        reelUrlForSubmission = completedUpload.fileUrl;
        setQueueItem((queueItem) => ({
          ...queueItem,
          uploadSession: {
            uploadId: completedUpload.uploadId,
            filePath: completedUpload.filePath,
            fileUrl: completedUpload.fileUrl,
            uploadedBytes: completedUpload.fileSize,
            uploadedParts: Array.from({ length: totalParts }, (_, index) => index),
            totalParts,
            chunkSize,
          },
          progress: 100,
          updatedAt: new Date().toISOString(),
        }));
      }

      if (!reelUrlForSubmission.startsWith("http")) {
        throw new Error("Please provide a valid reel URL or attach media for upload.");
      }

      const result = await postJson<MobileSubmissionResponse>(
        "/api/mobile/submissions",
        {
          slug: item.missionSlug,
          reelUrl: reelUrlForSubmission,
          captionSummary: item.captionSummary,
          notes: item.notes,
          checks: item.checks,
        },
        token,
        {
          retries: 0,
          headers: {
            "idempotency-key": item.idempotencyKey,
          },
        },
      );

      setSubmissionQueue((current) => current.map((queueItem) => {
        if (queueItem.localId !== item.localId) {
          return queueItem;
        }

        return {
          ...queueItem,
          status: "completed",
          progress: 100,
          updatedAt: new Date().toISOString(),
          nextRetryAt: null,
          lastError: null,
          serverSubmissionId: result.id,
        };
      }));

      setSubmissionId(result.id);
      setSubmissionError(null);
      setQueueNotice(`Upload completed for ${item.missionTitle}.`);
      await loadSubmissionHistory(token, { includeTotalOverride: true });
      setShouldIncludeTotalOnNextHead(false);
    } catch (requestError) {
      reportApiErrorDiagnostics(requestError, "processQueuedSubmission");
      const nowMs = Date.now();
      const message = toDisplayErrorMessage(requestError, "Submission failed. Please retry.");

      if (requestError instanceof ApiRequestError && requestError.status === 401) {
        setError("Session expired. Please sign in again.");
      }

      setSubmissionQueue((current) => current.map((queueItem) => {
        if (queueItem.localId !== item.localId) {
          return queueItem;
        }

        const retryable = requestError instanceof ApiRequestError && shouldRetryQueueError(requestError);
        const uploadedBytes = queueItem.uploadSession?.uploadedBytes ?? 0;
        const mediaBytes = queueItem.mediaAsset?.fileSize ?? 0;
        const mediaProgress = mediaBytes > 0 ? Math.round((uploadedBytes / mediaBytes) * 100) : queueItem.progress;
        if (retryable && queueItem.attempts < SUBMISSION_QUEUE_MAX_ATTEMPTS) {
          const retryDelay = getQueueRetryDelayMs(queueItem.attempts);
          return {
            ...queueItem,
            status: "retrying",
            progress: Math.max(0, Math.min(100, mediaProgress)),
            updatedAt: new Date().toISOString(),
            nextRetryAt: new Date(nowMs + retryDelay).toISOString(),
            lastError: message,
          };
        }

        return {
          ...queueItem,
          status: "failed",
          progress: Math.max(0, Math.min(100, mediaProgress)),
          updatedAt: new Date().toISOString(),
          nextRetryAt: null,
          lastError: message,
        };
      }));

      setSubmissionError(message);
      if (requestError instanceof ApiRequestError && shouldRetryQueueError(requestError) && item.attempts < SUBMISSION_QUEUE_MAX_ATTEMPTS) {
        setQueueNotice(`Upload retry scheduled for ${item.missionTitle}.`);
      } else {
        setQueueNotice(`Upload failed for ${item.missionTitle}.`);
      }
    } finally {
      queueProcessingLocalIdRef.current = null;
    }
  }, [loadSubmissionHistory]);

  const retrySubmissionFromQueue = useCallback((localId: string) => {
    setSubmissionQueue((current) => current.map((item) => {
      if (item.localId !== localId) {
        return item;
      }

      return {
        ...item,
        status: "queued",
        progress: item.mediaAsset && item.uploadSession
          ? Math.min(100, Math.round((item.uploadSession.uploadedBytes / Math.max(item.mediaAsset.fileSize, 1)) * 100))
          : 0,
        updatedAt: new Date().toISOString(),
        nextRetryAt: null,
        lastError: null,
      };
    }));
  }, []);

  const removeSubmissionFromQueue = useCallback((localId: string) => {
    setSubmissionQueue((current) => current.filter((item) => item.localId !== localId));
  }, []);

  const clearCompletedQueueItems = useCallback(() => {
    setSubmissionQueue((current) => current.filter((item) => item.status !== "completed"));
  }, []);

  const handlePickSubmissionMedia = useCallback(async () => {
    if (isSelectedMissionLocked) {
      setSubmissionError("Mission is locked. Reach the required level before uploading proof media.");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/*", "image/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const picked = result.assets[0];
      const fileSize = Number(picked.size ?? 0);
      if (!Number.isFinite(fileSize) || fileSize <= 0) {
        setSubmissionError("Selected media file is invalid.");
        return;
      }

      const fileInfo = await LegacyFileSystem.getInfoAsync(picked.uri, { md5: true });
      const fileChecksumMd5 = fileInfo.exists && typeof fileInfo.md5 === "string"
        ? fileInfo.md5.toLowerCase()
        : null;
      if (!fileChecksumMd5 || !/^[a-f0-9]{32}$/.test(fileChecksumMd5)) {
        setSubmissionError("Unable to compute file checksum for upload integrity.");
        return;
      }

      setSubmissionMediaAsset({
        uri: picked.uri,
        fileName: picked.name || "proof-media",
        mimeType: picked.mimeType || "application/octet-stream",
        fileSize,
        fileChecksumMd5,
      });
      setSubmissionError(null);
      setQueueNotice(`Attached ${picked.name || "media file"} (${formatBytes(fileSize)}).`);
    } catch (requestError) {
      reportApiErrorDiagnostics(requestError, "handlePickSubmissionMedia");
      setSubmissionError(toDisplayErrorMessage(requestError, "Unable to select media file."));
    }
  }, [isSelectedMissionLocked]);

  useEffect(() => {
    const restoreSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      setAccessToken(session.access_token);
      try {
        await syncServerSession(session.access_token, session.refresh_token);
        await loadProfile(session.access_token);
      } catch {
        setProfile(null);
      }
    };

    void restoreSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      const token = session?.access_token ?? null;
      setAccessToken(token);

      if (!token) {
        setProfile(null);
        if (event === "SIGNED_OUT") {
          void postJson<{ ok: boolean }>("/api/auth/signout", {});
        }
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void syncServerSession(token, session?.refresh_token ?? null).catch(() => {
          // Session cookie sync failure should not block local session usage.
        });
      }

      void loadProfile(token).catch(() => {
        setProfile(null);
      });
    });

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, [loadProfile, syncServerSession]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void registerSubmissionUploadBackgroundTask().then((result) => {
        if (!result.ok) {
          setQueueNotice("Background upload task is unavailable in this runtime.");
        }
      }).catch(() => {
        setQueueNotice("Background upload task registration failed.");
      });
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!profileId) {
        setSubmissionQueue([]);
        setSubmissionQueueHydrated(false);
        return;
      }

      void hydrateSubmissionQueueForUser(profileId);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [hydrateSubmissionQueueForUser, profileId]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void hydrateSubmissionQueueForUser(profileId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hydrateSubmissionQueueForUser, profileId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!profileId || !submissionQueueHydrated) {
        return;
      }

      const persistedItems = submissionQueue.filter((item) => {
        if (item.status !== "completed") {
          return true;
        }

        const updatedAtMs = Date.parse(item.updatedAt);
        if (Number.isNaN(updatedAtMs)) {
          return false;
        }

        return Date.now() - updatedAtMs < 15 * 60 * 1000;
      });

      const payload: SubmissionQueueCachePayload = {
        storedAt: Date.now(),
        items: persistedItems,
      };

      void AsyncStorage.setItem(getSubmissionQueueKey(profileId), JSON.stringify(payload));
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [profileId, submissionQueue, submissionQueueHydrated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!submissionQueueHydrated || !accessToken || !profileId) {
        return;
      }

      if (queueProcessingLocalIdRef.current) {
        return;
      }

      const nowMs = Date.now();
      const nextReadyItem = [...submissionQueue]
        .filter((item) => item.status === "queued" || (item.status === "retrying" && item.nextRetryAt !== null && Date.parse(item.nextRetryAt) <= nowMs))
        .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
        .at(0);

      if (nextReadyItem) {
        void processQueuedSubmission(nextReadyItem, accessToken);
        return;
      }

      const nextRetryMs = submissionQueue
        .filter((item) => item.status === "retrying" && item.nextRetryAt)
        .map((item) => Date.parse(item.nextRetryAt as string))
        .filter((value) => !Number.isNaN(value) && value > nowMs)
        .sort((left, right) => left - right)
        .at(0);

      if (nextRetryMs) {
        const delayMs = Math.min(nextRetryMs - nowMs, 1_000);
        setTimeout(() => {
          setQueueClockMs(Date.now());
        }, delayMs);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [accessToken, processQueuedSubmission, profileId, queueClockMs, submissionQueue, submissionQueueHydrated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!accessToken) {
        setSubmissionHistory([]);
        setExpandedHistoryIds([]);
        setHistoryError(null);
        setLoadingHistory(false);
        setLoadingMoreHistory(false);
        setHistoryHasMore(false);
          setHistoryCursor(null);
        setHistoryCacheHydrated(false);
        setShouldIncludeTotalOnNextHead(true);
        return;
      }

      void loadSubmissionHistory(accessToken, {
        statusFilter: historyStatusFilter,
        searchQuery: historySearchQuery,
      });
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [accessToken, historySearchQuery, historyStatusFilter, loadSubmissionHistory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!profile?.id) {
        return;
      }

      void hydrateHistoryFromCache(profile.id, historyStatusFilter, historySearchQuery);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [hydrateHistoryFromCache, historySearchQuery, historyStatusFilter, profile?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!profile?.id || !historyCacheHydrated) {
        return;
      }

      void persistHistoryToCache(
        profile.id,
        historyStatusFilter,
        historySearchQuery,
        {
          submissions: submissionHistory,
            historyCursor,
          historyHasMore,
        },
      );
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [
    historyCacheHydrated,
    historyHasMore,
    historyCursor,
    historySearchQuery,
    historyStatusFilter,
    persistHistoryToCache,
    profile?.id,
    submissionHistory,
  ]);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    const timer = setTimeout(() => {
      void loadMissionDetail(selectedSlug);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadMissionDetail, selectedSlug]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resetSubmissionState();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [resetSubmissionState, selectedSlug]);

  const handleSignIn = useCallback(async () => {
    if (!hasSupabaseMobileConfig) {
      setError("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    setAuthBusy(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        throw new Error(signInError?.message ?? "Unable to sign in.");
      }

      setAccessToken(data.session.access_token);
      await syncServerSession(data.session.access_token, data.session.refresh_token);

      await loadProfile(data.session.access_token);
    } catch (authError) {
      reportApiErrorDiagnostics(authError, "handleSignIn");
      setError(toDisplayErrorMessage(authError, "Unable to sign in."));
      setProfile(null);
    } finally {
      setAuthBusy(false);
    }
  }, [email, loadProfile, password, syncServerSession]);

  const handleSignOut = useCallback(async () => {
    setAuthBusy(true);
    setError(null);
    try {
      if (profileId) {
        await clearHistoryCacheForUser(profileId);
      }
      await postJson<{ ok: boolean }>("/api/auth/signout", {});
      await supabase.auth.signOut();
      setAccessToken(null);
      setProfile(null);
      setSubmissionQueue([]);
      setSubmissionQueueHydrated(false);
      setQueueNotice(null);
    } catch (authError) {
      reportApiErrorDiagnostics(authError, "handleSignOut");
      setError(toDisplayErrorMessage(authError, "Unable to sign out."));
    } finally {
      setAuthBusy(false);
    }
  }, [clearHistoryCacheForUser, profileId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMissions();
      if (selectedSlug) {
        await loadMissionDetail(selectedSlug);
      }
      if (accessToken) {
          await loadSubmissionHistory(accessToken, { includeTotalOverride: true });
          setShouldIncludeTotalOnNextHead(false);
      }
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, loadMissionDetail, loadMissions, loadSubmissionHistory, selectedSlug]);

  const handleSubmitProof = useCallback(() => {
    if (!accessToken) {
      setSubmissionError("Please sign in before submitting proof.");
      return;
    }

    if (!selectedMission) {
      setSubmissionError("Select a mission first.");
      return;
    }

    if (isSelectedMissionLocked) {
      setSubmissionError(`Mission is locked. Reach Lv.${selectedMission.requiredLevel} to submit proof.`);
      return;
    }

    if (!submissionReelUrl.trim().startsWith("http") && !submissionMediaAsset) {
      setSubmissionError("Please enter a valid reel URL or attach a media file.");
      return;
    }

    if (!submissionChecks.addedCollaborator) {
      setSubmissionError("Please confirm @missionone.hk was added as collaborator.");
      return;
    }

    setSubmissionBusy(true);
    setSubmissionError(null);

    try {
      queueSubmissionFromCurrentForm();
      setSubmissionId(null);
      setSubmissionCaptionSummary("");
      setSubmissionNotes("");
      setSubmissionChecks((current) => ({ ...current, taggedBrand: false, addedCollaborator: false }));
    } catch (requestError) {
      reportApiErrorDiagnostics(requestError, "handleSubmitProof");
      setSubmissionError(toDisplayErrorMessage(requestError, "Unable to queue submission."));
    } finally {
      setSubmissionBusy(false);
    }
  }, [
    accessToken,
    isSelectedMissionLocked,
    queueSubmissionFromCurrentForm,
    selectedMission,
    submissionChecks.addedCollaborator,
    submissionMediaAsset,
    submissionReelUrl,
  ]);

  const handleLoadMoreHistory = useCallback(async () => {
    if (!accessToken || !historyHasMore || loadingMoreHistory || loadingHistory) {
      return;
    }

    await loadSubmissionHistory(accessToken, { append: true, cursor: historyCursor });
  }, [accessToken, historyCursor, historyHasMore, loadSubmissionHistory, loadingHistory, loadingMoreHistory]);

  const toggleHistoryExpanded = useCallback((id: string) => {
    setExpandedHistoryIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  }, []);

  const openReelLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error("Unable to open this reel URL.");
      }
      await Linking.openURL(url);
    } catch (requestError) {
      reportApiErrorDiagnostics(requestError, "openReelLink");
      setHistoryError(toDisplayErrorMessage(requestError, "Unable to open reel URL."));
    }
  }, []);

  const authErrorHint = useMemo(() => {
    if (!error) {
      return null;
    }

    if (error.includes("Session expired")) {
      return "Please sign in again to continue.";
    }

    return "Tap retry after checking your connection.";
  }, [error]);

  function renderMissionRow(item: MobileMissionListItem) {
    const isActive = selectedItem?.slug === item.slug;
    const isLocked = userLevel < item.requiredLevel;

    return (
      <Pressable
        key={item.slug}
        onPress={() => {
          if (isLocked) {
            setDetailError(`This mission unlocks at Lv.${item.requiredLevel}. Your current level is Lv.${userLevel}.`);
            return;
          }
          setDetailError(null);
          setSelectedSlug(item.slug);
        }}
        style={[styles.missionRow, isActive ? styles.missionRowActive : null, isLocked ? styles.missionRowLocked : null]}
      >
        <View style={styles.missionRowTop}>
          <Text style={styles.missionTitle}>{item.title}</Text>
          <Text style={styles.missionReward}>{isLocked ? `Lv.${item.requiredLevel}` : `HK$${item.points}`}</Text>
        </View>
        <Text style={styles.missionMeta}>{item.brand} · {item.category}</Text>
        <Text style={styles.missionMeta}>{item.difficulty} · ETA {item.eta}</Text>
        {isLocked ? <Text style={styles.error}>Locked until Lv.{item.requiredLevel}</Text> : null}
        <Text style={styles.hint}>Participants: {item.currentParticipants}/{item.minParticipants}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={mobileTheme.colors.accent} />}
      >
        <Text style={styles.title}>Mission One Mobile</Text>
        <Text style={styles.subtitle}>Auth + missions list + mission detail from backend API</Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Auth</Text>
          {!hasSupabaseMobileConfig ? (
            <Text style={styles.error}>Missing mobile Supabase env setup.</Text>
          ) : null}

          {!accessToken ? (
            <View style={styles.authForm}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#64748b"
                secureTextEntry
                style={styles.input}
              />
              <Pressable onPress={handleSignIn} style={styles.primaryButton} disabled={authBusy || !hasSupabaseMobileConfig}>
                <Text style={styles.primaryButtonText}>{authBusy ? "Signing in..." : "Sign in"}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authSummary}>
              <Text style={styles.missionTitle}>{profile?.fullName || profile?.email || "Signed in"}</Text>
              <Text style={styles.missionMeta}>Balance: {profile?.balance ?? 0} Coins</Text>
              <Text style={styles.missionMeta}>Approved missions: {profile?.approvedMissionCount ?? 0}</Text>
              <Pressable onPress={handleSignOut} style={styles.secondaryButton} disabled={authBusy}>
                <Text style={styles.secondaryButtonText}>{authBusy ? "Signing out..." : "Sign out"}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.panelTitle}>Submission History</Text>
            {accessToken ? (
              <Pressable
                onPress={() => {
                  void loadSubmissionHistory(accessToken);
                }}
                style={styles.ghostButtonCompact}
                disabled={loadingHistory}
              >
                <Text style={styles.ghostButtonText}>{loadingHistory ? "Loading..." : "Reload"}</Text>
              </Pressable>
            ) : null}
          </View>

          {!accessToken ? (
            <View style={styles.stateCard}>
              <Text style={styles.hint}>Sign in to view your submission timeline.</Text>
            </View>
          ) : null}

            {accessToken ? (
              <View style={styles.historyToolbar}>
                <View style={styles.historyFilterWrap}>
                  {HISTORY_STATUS_FILTERS.map((statusOption) => (
                    <Pressable
                      key={statusOption}
                      onPress={() => {
                          setShouldIncludeTotalOnNextHead(true);
                        setHistoryStatusFilter(statusOption);
                      }}
                      style={[
                        styles.historyFilterChip,
                        historyStatusFilter === statusOption ? styles.historyFilterChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyFilterChipText,
                          historyStatusFilter === statusOption ? styles.historyFilterChipTextActive : null,
                        ]}
                      >
                        {statusOption}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  value={historySearchInput}
                  onChangeText={setHistorySearchInput}
                  placeholder="Search mission or brand"
                  placeholderTextColor={mobileTheme.colors.textSoft}
                  autoCapitalize="none"
                  style={styles.historySearchInput}
                />
              </View>
            ) : null}

          {accessToken && loadingHistory ? (
            <View style={styles.listContent}>
              {[0, 1].map((item) => (
                <View key={item} style={styles.skeletonRow} />
              ))}
              <ActivityIndicator color={mobileTheme.colors.accent} />
            </View>
          ) : null}

          {accessToken && !loadingHistory && historyError ? (
            <View style={styles.stateCard}>
              <Text style={styles.error}>Failed to load submission history.</Text>
              <Text style={styles.hint}>{historyError}</Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  if (accessToken) {
                    void loadSubmissionHistory(accessToken);
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Retry history</Text>
              </Pressable>
            </View>
          ) : null}

          {accessToken && !loadingHistory && !historyError && submissionHistory.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.hint}>
                {historyStatusFilter === "All" && !historySearchQuery
                  ? "No submissions yet. Your recent proof uploads will appear here."
                  : "No submissions match the current filters."}
              </Text>
            </View>
          ) : null}

          {accessToken && !loadingHistory && !historyError && submissionHistory.length > 0 ? (
            <View style={styles.listContent}>
              {submissionHistory.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.missionTitle}>{item.missionTitle}</Text>
                    <Text style={[styles.statusPill, getStatusTone(item.status)]}>{item.status}</Text>
                  </View>
                  <Text style={styles.missionMeta}>{item.missionBrand} · HK${item.rewardCoins}</Text>
                  <Text style={styles.hint}>Submitted: {formatDateTime(item.submittedAt)}</Text>
                  {item.reviewedAt ? <Text style={styles.hint}>Reviewed: {formatDateTime(item.reviewedAt)}</Text> : null}
                  {item.reviewDueAt ? <Text style={styles.hint}>Review due: {formatDateTime(item.reviewDueAt)}</Text> : null}

                  <View style={styles.historyActionsRow}>
                    <Pressable
                      style={styles.ghostActionButton}
                      onPress={() => {
                        toggleHistoryExpanded(item.id);
                      }}
                    >
                      <Text style={styles.ghostActionText}>
                        {expandedHistoryIds.includes(item.id) ? "Hide details" : "View details"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.ghostActionButton}
                      onPress={() => {
                        const linkedMission = missions.find((mission) => mission.slug === item.missionSlug);
                        if (linkedMission) {
                          setSelectedZone(normalizeMissionZone(linkedMission.difficulty));
                        }
                        setSelectedSlug(item.missionSlug);
                      }}
                    >
                      <Text style={styles.ghostActionText}>Open mission</Text>
                    </Pressable>

                    <Pressable
                      style={styles.ghostActionButton}
                      onPress={() => {
                        void openReelLink(item.reelUrl);
                      }}
                    >
                      <Text style={styles.ghostActionText}>Open reel</Text>
                    </Pressable>
                  </View>

                  {expandedHistoryIds.includes(item.id) ? (
                    <View style={styles.historyDetailPanel}>
                      {item.captionSummary ? <Text style={styles.hint}>Caption: {item.captionSummary}</Text> : null}
                      {item.notes ? <Text style={styles.hint}>Notes: {item.notes}</Text> : null}
                      {item.reviewedBy ? <Text style={styles.hint}>Reviewer: {item.reviewedBy}</Text> : null}
                      <Text style={styles.hint}>Reel URL: {item.reelUrl}</Text>
                    </View>
                  ) : null}

                  <View style={styles.timelineWrap}>
                    {item.timeline.map((event) => (
                      <View key={`${item.id}-${event.key}-${event.at}`} style={styles.timelineRow}>
                        <View style={[styles.timelineDot, getTimelineToneStyle(event.tone)]} />
                        <View style={styles.timelineTextWrap}>
                          <Text style={styles.timelineLabel}>{event.label}</Text>
                          <Text style={styles.timelineAt}>{formatDateTime(event.at)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {historyHasMore ? (
                <Pressable
                  style={[styles.secondaryButton, loadingMoreHistory ? styles.buttonDisabled : null]}
                  onPress={() => {
                    void handleLoadMoreHistory();
                  }}
                  disabled={loadingMoreHistory}
                >
                  <Text style={styles.secondaryButtonText}>{loadingMoreHistory ? "Loading more..." : "Load more history"}</Text>
                </Pressable>
              ) : (
                <Text style={styles.hint}>You have reached the end of your submission history.</Text>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.panelTitle}>Missions</Text>
            <Pressable
              onPress={() => {
                void loadMissions();
              }}
              style={styles.ghostButtonCompact}
              disabled={loadingList}
            >
              <Text style={styles.ghostButtonText}>{loadingList ? "Loading..." : "Reload"}</Text>
            </Pressable>
          </View>

          <View style={styles.zoneFilterWrap}>
            {MISSION_ZONE_FILTERS.map((zone) => {
              const requiredLevel = DIFFICULTY_REQUIRED_LEVEL[zone];
              const locked = !canAccessMissionZone(userLevel, zone);
              const active = selectedZone === zone;

              return (
                <Pressable
                  key={zone}
                  onPress={() => {
                    if (locked) {
                      setListError(`This zone unlocks at Lv.${requiredLevel}. Your current level is Lv.${userLevel}.`);
                      return;
                    }

                    setListError(null);
                    setSelectedZone(zone);
                    const zoneMissions = missions.filter((item) => normalizeMissionZone(item.difficulty) === zone);
                    if (zoneMissions.length > 0) {
                      setSelectedSlug(zoneMissions[0].slug);
                    } else {
                      setSelectedSlug(null);
                      setSelectedMission(null);
                    }
                  }}
                  style={[styles.zoneChip, active ? styles.zoneChipActive : null, locked ? styles.zoneChipLocked : null]}
                >
                  <Text style={[styles.zoneChipText, active ? styles.zoneChipTextActive : null]}>
                    {zone}{locked ? ` 🔒 Lv.${requiredLevel}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loadingList ? (
            <View style={styles.listContent}>
              {[0, 1, 2].map((item) => (
                <View key={item} style={styles.skeletonRow} />
              ))}
              <ActivityIndicator color="#22d3ee" />
            </View>
          ) : null}

          {!loadingList && listError ? (
            <View style={styles.stateCard}>
              <Text style={styles.error}>Failed to load missions.</Text>
              <Text style={styles.hint}>{listError}</Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void loadMissions();
                }}
              >
                <Text style={styles.secondaryButtonText}>Retry missions</Text>
              </Pressable>
            </View>
          ) : null}

          {!loadingList && !listError && filteredMissions.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.hint}>No active missions in this zone right now.</Text>
              <Text style={styles.hint}>Pull down to refresh or try again later.</Text>
            </View>
          ) : null}

          {!loadingList && !listError && filteredMissions.length > 0 ? (
            <FlatList
              data={filteredMissions}
              keyExtractor={(item) => item.slug}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
              renderItem={({ item }) => renderMissionRow(item)}
            />
          ) : null}
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.panelTitle}>Mission Detail</Text>
            {selectedSlug ? (
              <Pressable
                onPress={() => {
                  void loadMissionDetail(selectedSlug);
                }}
                style={styles.ghostButtonCompact}
                disabled={loadingDetail}
              >
                <Text style={styles.ghostButtonText}>{loadingDetail ? "Loading..." : "Refresh"}</Text>
              </Pressable>
            ) : null}
          </View>

          {loadingDetail ? (
            <View style={styles.detailLoadingWrap}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonLine} />
              <View style={styles.skeletonBlock} />
              <View style={styles.skeletonLineShort} />
              <ActivityIndicator color="#22d3ee" />
            </View>
          ) : null}

          {!loadingDetail && !selectedSlug ? (
            <View style={styles.stateCard}>
              <Text style={styles.hint}>Select a mission from the list to view details.</Text>
            </View>
          ) : null}

          {!loadingDetail && selectedSlug && detailError ? (
            <View style={styles.stateCard}>
              <Text style={styles.error}>Failed to load mission detail.</Text>
              <Text style={styles.hint}>{detailError}</Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void loadMissionDetail(selectedSlug);
                }}
              >
                <Text style={styles.secondaryButtonText}>Retry detail</Text>
              </Pressable>
            </View>
          ) : null}

          {!loadingDetail && selectedMission ? (
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{selectedMission.title}</Text>
              <Text style={styles.missionMeta}>{selectedMission.brand} · {selectedMission.category} · {selectedMission.difficulty}</Text>
              <Text style={styles.missionMeta}>Reward HK${selectedMission.points} · ETA {selectedMission.eta}</Text>
              <Text style={styles.missionMeta}>Required level: Lv.{selectedMission.requiredLevel} · Your level: Lv.{userLevel}</Text>

              {isSelectedMissionLocked ? (
                <View style={styles.stateCard}>
                  <Text style={styles.error}>This mission is locked.</Text>
                  <Text style={styles.hint}>Reach Lv.{selectedMission.requiredLevel} to unlock submission for this mission.</Text>
                </View>
              ) : null}

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Hook</Text>
                <Text style={styles.detailDescription}>{selectedMission.hook}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Brief</Text>
                <Text style={styles.detailDescription}>{selectedMission.description}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Requirements</Text>
                {selectedMission.requirements.length === 0
                  ? <Text style={styles.hint}>No requirements listed.</Text>
                  : selectedMission.requirements.map((item) => (
                    <Text key={item} style={styles.bulletItem}>• {item}</Text>
                  ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Deliverables</Text>
                {selectedMission.deliverables.length === 0
                  ? <Text style={styles.hint}>No deliverables listed.</Text>
                  : selectedMission.deliverables.map((item) => (
                    <Text key={item} style={styles.bulletItem}>• {item}</Text>
                  ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Participants</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, Math.round((selectedMission.currentParticipants / Math.max(selectedMission.minParticipants, 1)) * 100))}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.hint}>{selectedMission.currentParticipants}/{selectedMission.minParticipants} joined</Text>
              </View>

              <View style={styles.tagsWrap}>
                {selectedMission.tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Submit Proof</Text>
                {!accessToken ? (
                  <Text style={styles.hint}>Sign in to unlock proof submission.</Text>
                ) : null}

                {isSelectedMissionLocked ? (
                  <Text style={styles.hint}>Submission is disabled until this mission is unlocked.</Text>
                ) : null}

                {!isSelectedMissionLocked ? (
                  <View style={styles.mediaPickerWrap}>
                    <Pressable style={styles.secondaryButton} onPress={() => {
                      void handlePickSubmissionMedia();
                    }}>
                      <Text style={styles.secondaryButtonText}>{submissionMediaAsset ? "Replace media file" : "Attach media file"}</Text>
                    </Pressable>
                    {submissionMediaAsset ? (
                      <View style={styles.mediaPickerMetaRow}>
                        <Text style={styles.hint}>Attached: {submissionMediaAsset.fileName} ({formatBytes(submissionMediaAsset.fileSize)})</Text>
                        <Pressable
                          style={styles.ghostActionButton}
                          onPress={() => {
                            setSubmissionMediaAsset(null);
                          }}
                        >
                          <Text style={styles.ghostActionText}>Remove file</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.hint}>Attach a video/image proof for resumable upload, or paste a reel URL below.</Text>
                    )}
                  </View>
                ) : null}

                {!isSelectedMissionLocked ? (
                  <TextInput
                    value={submissionReelUrl}
                    onChangeText={setSubmissionReelUrl}
                    placeholder="https://instagram.com/reel/... (optional if file attached)"
                    placeholderTextColor={mobileTheme.colors.textSoft}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                ) : null}

                {!isSelectedMissionLocked ? (
                  <TextInput
                    value={submissionCaptionSummary}
                    onChangeText={setSubmissionCaptionSummary}
                    placeholder="Caption summary (optional)"
                    placeholderTextColor={mobileTheme.colors.textSoft}
                    multiline
                    numberOfLines={3}
                    style={[styles.input, styles.textAreaInput]}
                  />
                ) : null}

                {!isSelectedMissionLocked ? (
                  <TextInput
                    value={submissionNotes}
                    onChangeText={setSubmissionNotes}
                    placeholder="Notes (optional)"
                    placeholderTextColor={mobileTheme.colors.textSoft}
                    multiline
                    numberOfLines={3}
                    style={[styles.input, styles.textAreaInput]}
                  />
                ) : null}

                {!isSelectedMissionLocked ? (
                  <View style={styles.checklistWrap}>
                  {[
                    { key: "published", label: "Video is published publicly" },
                    { key: "taggedBrand", label: "Brand account and hashtags are tagged" },
                    { key: "addedCollaborator", label: "@missionone.hk added as collaborator" },
                  ].map((item) => {
                    const checked = submissionChecks[item.key as keyof typeof submissionChecks];
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => {
                          setSubmissionChecks((current) => ({
                            ...current,
                            [item.key]: !current[item.key as keyof typeof current],
                          }));
                        }}
                        style={styles.checklistRow}
                      >
                        <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]} />
                        <Text style={styles.checklistLabel}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                  </View>
                ) : null}

                {submissionError ? <Text style={styles.error}>{submissionError}</Text> : null}
                {submissionId ? <Text style={styles.success}>Submitted successfully. ID: {submissionId}</Text> : null}
                {queueNotice ? <Text style={styles.hint}>{queueNotice}</Text> : null}

                <Pressable
                  onPress={() => {
                    void handleSubmitProof();
                  }}
                  style={[styles.primaryButton, !canSubmit || submissionBusy ? styles.buttonDisabled : null]}
                  disabled={!canSubmit || submissionBusy}
                >
                  <Text style={styles.primaryButtonText}>{submissionBusy ? "Submitting..." : "Submit proof"}</Text>
                </Pressable>

                <View style={styles.queuePanel}>
                  <View style={styles.queueHeaderRow}>
                    <Text style={styles.detailSectionTitle}>Upload Queue</Text>
                    <Text style={styles.hint}>{pendingQueueCount} pending</Text>
                  </View>

                  {displaySubmissionQueue.length === 0 ? (
                    <Text style={styles.hint}>No pending uploads. New proof submissions will appear here.</Text>
                  ) : (
                    <View style={styles.queueList}>
                      {displaySubmissionQueue.map((item) => {
                        const retryCountdown = formatRetryCountdown(item.nextRetryAt);
                        const canRetryNow = item.status === "retrying" || item.status === "failed";
                        const canRemove = item.status === "failed" || item.status === "completed" || item.status === "queued";
                        return (
                          <View key={item.localId} style={styles.queueCard}>
                            <View style={styles.queueHeaderRow}>
                              <Text style={styles.missionTitle}>{item.missionTitle}</Text>
                              <Text style={styles.hint}>{getQueueStatusLabel(item.status)} · Try {Math.max(item.attempts, 1)}</Text>
                            </View>
                            <Text style={styles.hint}>Queued: {formatDateTime(item.createdAt)}</Text>
                            {item.mediaAsset ? (
                              <Text style={styles.hint}>Media: {item.mediaAsset.fileName} ({formatBytes(item.mediaAsset.fileSize)})</Text>
                            ) : (
                              <Text style={styles.hint}>Mode: URL submission</Text>
                            )}

                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${Math.min(100, Math.max(0, item.progress))}%`,
                                  },
                                ]}
                              />
                            </View>

                            {item.status === "uploading" ? <ActivityIndicator color={mobileTheme.colors.accent} size="small" /> : null}
                            {item.mediaAsset && item.uploadSession ? (
                              <Text style={styles.hint}>
                                {formatBytes(item.uploadSession.uploadedBytes)} / {formatBytes(item.mediaAsset.fileSize)} uploaded
                              </Text>
                            ) : null}
                            {item.status === "retrying" && retryCountdown ? <Text style={styles.hint}>{retryCountdown}</Text> : null}
                            {item.serverSubmissionId ? <Text style={styles.success}>Submission ID: {item.serverSubmissionId}</Text> : null}
                            {item.lastError ? <Text style={styles.error}>{item.lastError}</Text> : null}

                            <View style={styles.queueActionRow}>
                              {canRetryNow ? (
                                <Pressable
                                  style={styles.ghostActionButton}
                                  onPress={() => {
                                    retrySubmissionFromQueue(item.localId);
                                  }}
                                >
                                  <Text style={styles.ghostActionText}>Retry now</Text>
                                </Pressable>
                              ) : null}

                              {canRemove ? (
                                <Pressable
                                  style={styles.ghostActionButton}
                                  onPress={() => {
                                    removeSubmissionFromQueue(item.localId);
                                  }}
                                >
                                  <Text style={styles.ghostActionText}>Remove</Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {submissionQueue.some((item) => item.status === "completed") ? (
                    <Pressable style={styles.secondaryButton} onPress={clearCompletedQueueItems}>
                      <Text style={styles.secondaryButtonText}>Clear completed uploads</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>Error: {error}</Text> : null}
        {error && authErrorHint ? <Text style={styles.hint}>{authErrorHint}</Text> : null}

        {error ? (
          <Pressable
            onPress={() => {
              setError(null);
              void handleRefresh();
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        ) : null}

        <Text style={styles.footer}>API base URL: {API_BASE_URL}</Text>
        <Text style={styles.footer}>Environment: {mobileConfig.appEnvironment}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.sm,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.title,
    fontWeight: "700",
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.bodySm,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: mobileTheme.colors.panel,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.sm,
  },
  authForm: {
    gap: 8,
  },
  authSummary: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.panelMuted,
    color: mobileTheme.colors.text,
    borderRadius: mobileTheme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: mobileTheme.tapTarget.minHeight,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: mobileTheme.radius.sm,
    minHeight: mobileTheme.tapTarget.minHeight,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: mobileTheme.colors.accentText,
    fontWeight: "700",
    fontSize: mobileTheme.type.body,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    minHeight: mobileTheme.tapTarget.minHeight,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 6,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#cbd5e1",
    fontWeight: "600",
    fontSize: mobileTheme.type.body,
  },
  panelTitle: {
    color: "#e2e8f0",
    fontSize: mobileTheme.type.body,
    fontWeight: "600",
    marginBottom: 8,
  },
  listContent: {
    gap: 8,
  },
  zoneFilterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  zoneChip: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: 999,
    minHeight: 38,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  zoneChipActive: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: "rgba(34, 211, 238, 0.2)",
  },
  zoneChipLocked: {
    opacity: 0.65,
  },
  zoneChipText: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.caption,
    fontWeight: "700",
  },
  zoneChipTextActive: {
    color: mobileTheme.colors.text,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  ghostButtonCompact: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.caption,
    fontWeight: "600",
  },
  missionRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: mobileTheme.radius.sm,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.panelMuted,
    gap: 3,
    minHeight: mobileTheme.tapTarget.minHeight,
  },
  missionRowActive: {
    borderColor: "#22d3ee",
    backgroundColor: "rgba(34, 211, 238, 0.12)",
  },
  missionRowLocked: {
    opacity: 0.65,
  },
  missionRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  missionReward: {
    color: mobileTheme.colors.accent,
    fontSize: mobileTheme.type.bodySm,
    fontWeight: "700",
  },
  missionTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.body,
    fontWeight: "600",
  },
  missionMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.caption,
  },
  detailContent: {
    gap: 10,
  },
  detailTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  detailDescription: {
    color: "#cbd5e1",
    fontSize: mobileTheme.type.bodySm,
    lineHeight: 20,
  },
  detailSection: {
    backgroundColor: mobileTheme.colors.panelMuted,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    padding: 10,
    gap: 6,
  },
  detailSectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.bodySm,
    fontWeight: "700",
  },
  bulletItem: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.bodySm,
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: mobileTheme.colors.panelMuted,
  },
  tagText: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.caption,
    fontWeight: "600",
  },
  checklistWrap: {
    gap: 8,
  },
  mediaPickerWrap: {
    gap: 8,
    marginBottom: 2,
  },
  mediaPickerMetaRow: {
    gap: 8,
  },
  queuePanel: {
    marginTop: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    padding: 10,
  },
  queueList: {
    gap: 8,
  },
  queueCard: {
    gap: 6,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: mobileTheme.colors.panelMuted,
    padding: 8,
  },
  queueHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  queueActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: mobileTheme.colors.panelMuted,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  historyActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  historyToolbar: {
    gap: 8,
    marginBottom: 8,
  },
  historyFilterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  historyFilterChip: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 10,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  historyFilterChipActive: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: "rgba(34, 211, 238, 0.2)",
  },
  historyFilterChipText: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.caption,
    fontWeight: "600",
  },
  historyFilterChipTextActive: {
    color: mobileTheme.colors.text,
  },
  historySearchInput: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.panelMuted,
    color: mobileTheme.colors.text,
    borderRadius: mobileTheme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: mobileTheme.tapTarget.minHeight,
    fontSize: mobileTheme.type.bodySm,
  },
  ghostActionButton: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  ghostActionText: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.caption,
    fontWeight: "600",
  },
  historyDetailPanel: {
    marginTop: 4,
    padding: 8,
    borderRadius: mobileTheme.radius.sm,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    gap: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: mobileTheme.type.caption,
    fontWeight: "700",
    overflow: "hidden",
  },
  statusNeutral: {
    backgroundColor: "#1f2937",
    color: "#cbd5e1",
  },
  statusSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    color: "#86efac",
  },
  statusDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "#fca5a5",
  },
  timelineWrap: {
    marginTop: 4,
    gap: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  timelineNeutral: {
    backgroundColor: "#94a3b8",
  },
  timelineSuccess: {
    backgroundColor: "#4ade80",
  },
  timelineDanger: {
    backgroundColor: "#f87171",
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineLabel: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.type.bodySm,
    fontWeight: "600",
  },
  timelineAt: {
    color: mobileTheme.colors.textSoft,
    fontSize: mobileTheme.type.caption,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: mobileTheme.tapTarget.minHeight,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: mobileTheme.colors.panelMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: mobileTheme.colors.accent,
    borderColor: mobileTheme.colors.accent,
  },
  checklistLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.bodySm,
    flex: 1,
  },
  textAreaInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  success: {
    color: "#86efac",
    fontSize: mobileTheme.type.bodySm,
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#233145",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.accent,
  },
  detailLoadingWrap: {
    gap: 10,
    alignItems: "stretch",
  },
  skeletonRow: {
    height: 78,
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: "#162235",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  skeletonTitle: {
    height: 22,
    width: "70%",
    borderRadius: 8,
    backgroundColor: "#162235",
  },
  skeletonLine: {
    height: 14,
    width: "88%",
    borderRadius: 8,
    backgroundColor: "#162235",
  },
  skeletonLineShort: {
    height: 14,
    width: "56%",
    borderRadius: 8,
    backgroundColor: "#162235",
  },
  skeletonBlock: {
    height: 90,
    width: "100%",
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: "#162235",
  },
  stateCard: {
    borderRadius: mobileTheme.radius.sm,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.panelMuted,
    padding: 12,
    gap: 6,
  },
  hint: {
    color: mobileTheme.colors.textMuted,
    fontSize: mobileTheme.type.caption,
  },
  error: {
    color: mobileTheme.colors.danger,
    fontSize: mobileTheme.type.bodySm,
  },
  footer: {
    color: mobileTheme.colors.textSoft,
    fontSize: 11,
  },
});
