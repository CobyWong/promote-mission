import { NextResponse } from "next/server";

import { getMissionCatalog } from "@/lib/backend";

export async function GET() {
  const catalog = await getMissionCatalog();

  const missions = catalog.missions.map((mission) => ({
    slug: mission.slug,
    title: mission.title,
    brand: mission.brand,
    points: mission.points,
    difficulty: mission.difficulty,
    eta: mission.eta,
    category: mission.category,
    imageUrl: mission.imageUrl ?? null,
    minParticipants: mission.minParticipants ?? 0,
    currentParticipants: mission.currentParticipants ?? 0,
  }));

  return NextResponse.json({
    mode: catalog.mode,
    missions,
  });
}