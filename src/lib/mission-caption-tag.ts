import type { Mission } from "@/lib/data";

const HASHTAG_BODY_REGEX = /[\p{L}\p{N}_]+/u;
const HASHTAG_CAPTURE_REGEX = /(?:^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]+)/gu;

export function normalizeCaptionTag(raw: string | null | undefined) {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim().replace(/^#+/, "");
  if (!trimmed) {
    return null;
  }

  const body = trimmed.match(HASHTAG_BODY_REGEX)?.[0] ?? "";
  if (!body) {
    return null;
  }

  return `#${body.toLowerCase()}`;
}

export function extractCaptionTags(caption: string | null | undefined) {
  if (!caption) {
    return new Set<string>();
  }

  const normalized = new Set<string>();
  for (const match of caption.matchAll(HASHTAG_CAPTURE_REGEX)) {
    const tag = normalizeCaptionTag(match[1]);
    if (tag) {
      normalized.add(tag);
    }
  }

  return normalized;
}

export function captionHasMissionTag(caption: string | null | undefined, requiredTag: string | null | undefined) {
  const normalizedTag = normalizeCaptionTag(requiredTag);
  if (!normalizedTag) {
    return true;
  }

  return extractCaptionTags(caption).has(normalizedTag);
}

export function getRequiredMissionCaptionTag(tags: string[] | null | undefined) {
  for (const tag of tags ?? []) {
    if (!tag.trim().startsWith("#")) {
      continue;
    }

    const normalized = normalizeCaptionTag(tag);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getRequiredMissionCaptionTagFromMission(mission: Pick<Mission, "tags">) {
  return getRequiredMissionCaptionTag(mission.tags);
}