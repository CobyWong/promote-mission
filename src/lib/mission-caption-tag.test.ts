import { describe, expect, it } from "vitest";

import {
  captionHasMissionTag,
  extractCaptionTags,
  getRequiredMissionCaptionTag,
  normalizeCaptionTag,
} from "@/lib/mission-caption-tag";

describe("mission caption tags", () => {
  it("normalizes hashtag input", () => {
    expect(normalizeCaptionTag(" #MissionOne_Funny ")).toBe("#missionone_funny");
    expect(normalizeCaptionTag("mission2026")).toBe("#mission2026");
    expect(normalizeCaptionTag("###")).toBeNull();
  });

  it("extracts all hashtags from caption", () => {
    const tags = extractCaptionTags("Join now! #MissionOne #Creator_Life #missionone");
    expect([...tags]).toEqual(["#missionone", "#creator_life"]);
  });

  it("checks whether caption has required tag", () => {
    expect(captionHasMissionTag("Hello #m1_funny", "#M1_Funny")).toBe(true);
    expect(captionHasMissionTag("Hello #m1_other", "#M1_Funny")).toBe(false);
    expect(captionHasMissionTag("Hello #m1_other", null)).toBe(true);
  });

  it("reads first hashtag tag from mission tags", () => {
    expect(getRequiredMissionCaptionTag(["Community", "#M1_FUNNY", "Easy"])).toBe("#m1_funny");
    expect(getRequiredMissionCaptionTag(["Community", "Funny", "Easy"])).toBeNull();
  });
});