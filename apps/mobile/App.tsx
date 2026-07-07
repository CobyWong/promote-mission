import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { API_BASE_URL, fetchJson, postJson } from "./src/lib/api";
import { hasSupabaseMobileConfig, supabase } from "./src/lib/supabase";
import { mobileTheme } from "./src/theme/mobile";

type MobileMissionListItem = {
  slug: string;
  title: string;
  brand: string;
  points: number;
  difficulty: string;
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

const HISTORY_PAGE_SIZE = 6;
const HISTORY_CACHE_VERSION = 1;
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const HISTORY_STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected"] as const;

function getHistoryCacheKey(userId: string, statusFilter: string, searchQuery: string) {
  const normalizedStatus = statusFilter.trim().toLowerCase() || "all";
  const normalizedQuery = searchQuery.trim().toLowerCase() || "none";
  return `mobile:submission-history:v${HISTORY_CACHE_VERSION}:${userId}:${normalizedStatus}:${normalizedQuery}`;
}

function getHistoryCachePrefix(userId: string) {
  return `mobile:submission-history:v${HISTORY_CACHE_VERSION}:${userId}:`;
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

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MobileMeResponse["user"] | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [missions, setMissions] = useState<MobileMissionListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<MobileMissionDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submissionReelUrl, setSubmissionReelUrl] = useState("");
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
  const profileId = profile?.id ?? null;

  const selectedItem = useMemo(
    () => missions.find((item) => item.slug === selectedSlug) ?? null,
    [missions, selectedSlug],
  );

  const canSubmit = useMemo(() => {
    return Boolean(
      accessToken
      && selectedMission
      && submissionReelUrl.trim().startsWith("http")
      && submissionChecks.addedCollaborator,
    );
  }, [accessToken, selectedMission, submissionChecks.addedCollaborator, submissionReelUrl]);

  const loadMissions = useCallback(async () => {
    setLoadingList(true);
    setListError(null);

    try {
      const data = await fetchJson<{ missions: MobileMissionListItem[] }>("/api/mobile/missions");
      setMissions(data.missions);
      if (data.missions.length === 0) {
        setSelectedSlug(null);
        setSelectedMission(null);
        return;
      }

      const stillSelected = selectedSlug && data.missions.some((item) => item.slug === selectedSlug);
      if (!stillSelected) {
        setSelectedSlug(data.missions[0].slug);
      }
    } catch (requestError) {
      setListError(requestError instanceof Error ? requestError.message : "Unable to load missions.");
      setMissions([]);
      setSelectedSlug(null);
      setSelectedMission(null);
    } finally {
      setLoadingList(false);
    }
  }, [selectedSlug]);

  const loadMissionDetail = useCallback(async (slug: string) => {
    setLoadingDetail(true);
    setDetailError(null);

    try {
      const data = await fetchJson<{ mission: MobileMissionDetail }>(`/api/mobile/missions/${slug}`);
      setSelectedMission(data.mission);
    } catch (requestError) {
      setDetailError(requestError instanceof Error ? requestError.message : "Unable to load mission detail.");
      setSelectedMission(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const resetSubmissionState = useCallback(() => {
    setSubmissionReelUrl("");
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
      setHistoryError(requestError instanceof Error ? requestError.message : "Unable to load submission history.");
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
        await loadProfile(session.access_token);
      } catch {
        setProfile(null);
      }
    };

    void restoreSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      setAccessToken(token);

      if (!token) {
        setProfile(null);
        return;
      }

      void loadProfile(token).catch(() => {
        setProfile(null);
      });
    });

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

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

      // Keep parity with web session endpoint used by the existing backend.
      await postJson<{ ok: boolean }>("/api/auth/session", {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      await loadProfile(data.session.access_token);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to sign in.");
      setProfile(null);
    } finally {
      setAuthBusy(false);
    }
  }, [email, loadProfile, password]);

  const handleSignOut = useCallback(async () => {
    setAuthBusy(true);
    setError(null);
    try {
      if (profileId) {
        await clearHistoryCacheForUser(profileId);
      }
      await supabase.auth.signOut();
      setAccessToken(null);
      setProfile(null);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to sign out.");
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

  const handleSubmitProof = useCallback(async () => {
    if (!accessToken) {
      setSubmissionError("Please sign in before submitting proof.");
      return;
    }

    if (!selectedMission) {
      setSubmissionError("Select a mission first.");
      return;
    }

    if (!submissionReelUrl.trim().startsWith("http")) {
      setSubmissionError("Please enter a valid reel URL.");
      return;
    }

    if (!submissionChecks.addedCollaborator) {
      setSubmissionError("Please confirm @missionone.hk was added as collaborator.");
      return;
    }

    setSubmissionBusy(true);
    setSubmissionError(null);

    try {
      const result = await postJson<MobileSubmissionResponse>(
        "/api/mobile/submissions",
        {
          slug: selectedMission.slug,
          reelUrl: submissionReelUrl.trim(),
          captionSummary: submissionCaptionSummary,
          notes: submissionNotes,
          checks: submissionChecks,
        },
        accessToken,
      );

      setSubmissionId(result.id);
      setSubmissionCaptionSummary("");
      setSubmissionNotes("");
      setSubmissionChecks((current) => ({ ...current, taggedBrand: false, addedCollaborator: false }));
      await loadSubmissionHistory(accessToken);
    } catch (requestError) {
      setSubmissionError(requestError instanceof Error ? requestError.message : "Submission failed. Please retry.");
    } finally {
      setSubmissionBusy(false);
    }
  }, [accessToken, loadSubmissionHistory, selectedMission, submissionReelUrl, submissionCaptionSummary, submissionNotes, submissionChecks]);

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
      setHistoryError(requestError instanceof Error ? requestError.message : "Unable to open reel URL.");
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

    return (
      <Pressable
        key={item.slug}
        onPress={() => setSelectedSlug(item.slug)}
        style={[styles.missionRow, isActive ? styles.missionRowActive : null]}
      >
        <View style={styles.missionRowTop}>
          <Text style={styles.missionTitle}>{item.title}</Text>
          <Text style={styles.missionReward}>HK${item.points}</Text>
        </View>
        <Text style={styles.missionMeta}>{item.brand} · {item.category}</Text>
        <Text style={styles.missionMeta}>{item.difficulty} · ETA {item.eta}</Text>
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
        <Text style={styles.subtitle}>Phase 5 preview: Auth + Missions list + detail from backend API</Text>

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

          {!loadingList && !listError && missions.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.hint}>No active missions right now.</Text>
              <Text style={styles.hint}>Pull down to refresh or try again later.</Text>
            </View>
          ) : null}

          {!loadingList && !listError && missions.length > 0 ? (
            <FlatList
              data={missions}
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

                <TextInput
                  value={submissionReelUrl}
                  onChangeText={setSubmissionReelUrl}
                  placeholder="https://instagram.com/reel/..."
                  placeholderTextColor={mobileTheme.colors.textSoft}
                  autoCapitalize="none"
                  style={styles.input}
                />

                <TextInput
                  value={submissionCaptionSummary}
                  onChangeText={setSubmissionCaptionSummary}
                  placeholder="Caption summary (optional)"
                  placeholderTextColor={mobileTheme.colors.textSoft}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textAreaInput]}
                />

                <TextInput
                  value={submissionNotes}
                  onChangeText={setSubmissionNotes}
                  placeholder="Notes (optional)"
                  placeholderTextColor={mobileTheme.colors.textSoft}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textAreaInput]}
                />

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

                {submissionError ? <Text style={styles.error}>{submissionError}</Text> : null}
                {submissionId ? <Text style={styles.success}>Submitted successfully. ID: {submissionId}</Text> : null}

                <Pressable
                  onPress={() => {
                    void handleSubmitProof();
                  }}
                  style={[styles.primaryButton, !canSubmit || submissionBusy ? styles.buttonDisabled : null]}
                  disabled={!canSubmit || submissionBusy}
                >
                  <Text style={styles.primaryButtonText}>{submissionBusy ? "Submitting..." : "Submit proof"}</Text>
                </Pressable>
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
