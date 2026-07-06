import { NextResponse } from "next/server";

import { getMissionBySlug } from "@/lib/backend";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const mission = await getMissionBySlug(slug);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found." }, { status: 404 });
  }

  return NextResponse.json({
    mission: {
      slug: mission.slug,
      title: mission.title,
      brand: mission.brand,
      product: mission.product,
      points: mission.points,
      difficulty: mission.difficulty,
      eta: mission.eta,
      category: mission.category,
      description: mission.description,
      hook: mission.hook,
      requirements: mission.requirements,
      deliverables: mission.deliverables,
      tags: mission.tags,
      imageUrl: mission.imageUrl ?? null,
      minParticipants: mission.minParticipants ?? 0,
      currentParticipants: mission.currentParticipants ?? 0,
    },
  });
}