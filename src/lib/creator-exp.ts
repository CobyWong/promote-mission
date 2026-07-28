type ReelInsightExpRow = {
  media_id?: string | null;
  reel_url?: string | null;
  plays?: number | null;
  likes?: number | null;
  metric_date?: string | null;
  created_at?: string | null;
};

function toComparableTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMoreRecent(candidate: ReelInsightExpRow, current: ReelInsightExpRow) {
  const candidateMetricDate = candidate.metric_date ?? "";
  const currentMetricDate = current.metric_date ?? "";

  if (candidateMetricDate !== currentMetricDate) {
    return candidateMetricDate > currentMetricDate;
  }

  return toComparableTimestamp(candidate.created_at) > toComparableTimestamp(current.created_at);
}

function getInsightKey(row: ReelInsightExpRow, index: number) {
  const mediaId = row.media_id?.trim();
  if (mediaId) {
    return `media:${mediaId}`;
  }

  const reelUrl = row.reel_url?.trim();
  if (reelUrl) {
    return `url:${reelUrl}`;
  }

  return `unknown:${index}`;
}

export function getExpFromViewsAndLikes(views: number | null | undefined, likes: number | null | undefined) {
  return Math.max(0, views ?? 0) + Math.max(0, likes ?? 0);
}

export function getCreatorExpFromReelInsights(rows: ReelInsightExpRow[] | null | undefined) {
  const latestByReel = new Map<string, ReelInsightExpRow>();

  for (const [index, row] of (rows ?? []).entries()) {
    const key = getInsightKey(row, index);
    const current = latestByReel.get(key);

    if (!current || isMoreRecent(row, current)) {
      latestByReel.set(key, row);
    }
  }

  let totalExp = 0;
  for (const row of latestByReel.values()) {
    totalExp += getExpFromViewsAndLikes(row.plays, row.likes);
  }

  return totalExp;
}
