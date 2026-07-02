const missionImageBySlug: Record<string, string> = {
  "spark-hydration-bottle": "/missions/hydration-bottle.svg",
  "nova-beauty-serum": "/missions/beauty-serum.svg",
  "fitbyte-protein-chips": "/missions/protein-chips.svg",
  "roam-mini-projector": "/missions/mini-projector.svg",
};

export function getMissionImage(slug: string) {
  return missionImageBySlug[slug] ?? "/missions/default-mission.svg";
}
