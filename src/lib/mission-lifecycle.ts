type MissionLifecycleStatus = "draft" | "active" | "paused" | "full" | "ended" | "archived";

type MissionLifecycleInput = {
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export const MISSION_RANKING_CONFIRMATION_DAYS = Math.max(
  1,
  Number.parseInt(process.env.MISSION_RANKING_CONFIRMATION_DAYS ?? "3", 10) || 3,
);

function normalizeMissionStatus(status: string | null | undefined): MissionLifecycleStatus {
  const normalized = String(status ?? "draft").toLowerCase();
  if (
    normalized === "active"
    || normalized === "paused"
    || normalized === "full"
    || normalized === "ended"
    || normalized === "archived"
  ) {
    return normalized;
  }

  return "draft";
}

function parseTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function toUtcDateString(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function getMissionRankingConfirmationEndsAt(endsAt?: string | null) {
  const endsAtTs = parseTime(endsAt);
  if (endsAtTs === null) {
    return null;
  }

  return new Date(endsAtTs + MISSION_RANKING_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function getMissionLifecyclePhase(input: MissionLifecycleInput, now = Date.now()): "upcoming" | "live" | "ranking_confirmation" | "closed" {
  const status = normalizeMissionStatus(input.status);

  if (status === "draft" || status === "paused" || status === "archived") {
    return "closed";
  }

  const startsAtTs = parseTime(input.starts_at);
  if (startsAtTs !== null && startsAtTs > now) {
    return "upcoming";
  }

  const endsAtTs = parseTime(input.ends_at);
  if (endsAtTs === null || now < endsAtTs) {
    return "live";
  }

  const rankingConfirmationEndsAtTs = endsAtTs + MISSION_RANKING_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000;
  if (now <= rankingConfirmationEndsAtTs) {
    return "ranking_confirmation";
  }

  return "closed";
}

export function getMissionRankingCutoffDate(input: MissionLifecycleInput, now = Date.now()) {
  const endsAtTs = parseTime(input.ends_at);
  if (endsAtTs === null || now < endsAtTs) {
    return null;
  }

  return toUtcDateString(endsAtTs);
}

export function isMissionVisibleForCreators(input: MissionLifecycleInput, now = Date.now()) {
  const phase = getMissionLifecyclePhase(input, now);
  return phase === "live" || phase === "ranking_confirmation";
}

export function isMissionOpenForApplications(input: MissionLifecycleInput, now = Date.now()) {
  const status = normalizeMissionStatus(input.status);
  if (status !== "active") {
    return false;
  }

  return getMissionLifecyclePhase(input, now) === "live";
}
