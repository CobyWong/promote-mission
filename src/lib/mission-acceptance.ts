export function getMissionAcceptanceStorageKey(missionSlug: string) {
  return `pm:mission-accept:${missionSlug}`;
}

export function parseMissionEtaToMs(eta: string) {
  const normalized = eta.toLowerCase().trim();

  const dayMatch = normalized.match(/(\d+)\s*day/);
  if (dayMatch) {
    return Number(dayMatch[1]) * 24 * 60 * 60 * 1000;
  }

  const hourMatch = normalized.match(/(\d+)\s*h/);
  if (hourMatch) {
    return Number(hourMatch[1]) * 60 * 60 * 1000;
  }

  const minuteMatch = normalized.match(/(\d+)\s*m/);
  if (minuteMatch) {
    return Number(minuteMatch[1]) * 60 * 1000;
  }

  return 24 * 60 * 60 * 1000;
}

export function getMissionRemainingMs(acceptedAt: number, eta: string, now = Date.now()) {
  return acceptedAt + parseMissionEtaToMs(eta) - now;
}

export function isMissionAcceptanceValid(acceptedAt: number, eta: string, now = Date.now()) {
  return getMissionRemainingMs(acceptedAt, eta, now) > 0;
}
