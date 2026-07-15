const REWARD_PRIZE_TO_COINS_MULTIPLIER = 100;

function parseNumber(raw: string) {
  return Number.parseInt(raw.replace(/,/g, ""), 10);
}

function extractPrizeFromName(name?: string | null) {
  if (!name) {
    return null;
  }

  const hkdMatch = name.match(/HK\$\s*([0-9][0-9,]*)/i);
  if (hkdMatch?.[1]) {
    const parsed = parseNumber(hkdMatch[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function extractPrizeFromSlug(slug?: string | null) {
  if (!slug) {
    return null;
  }

  const supportedPattern = /(gift-card|voucher|coupon|eshop)-([0-9]+)$/i;
  const matched = slug.match(supportedPattern);
  if (!matched?.[2]) {
    return null;
  }

  const parsed = Number.parseInt(matched[2], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getRewardRequiredCoins(input: {
  name?: string | null;
  slug?: string | null;
  fallbackCost?: number;
}) {
  const prizeFromName = extractPrizeFromName(input.name);
  const prizeFromSlug = extractPrizeFromSlug(input.slug);
  const rewardPrize = prizeFromName ?? prizeFromSlug;

  if (!rewardPrize) {
    return input.fallbackCost;
  }

  return rewardPrize * REWARD_PRIZE_TO_COINS_MULTIPLIER;
}
