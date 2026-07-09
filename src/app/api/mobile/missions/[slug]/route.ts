import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { getMissionBySlug } from "@/lib/backend";
import { getMissionRequiredLevel } from "@/lib/mission-rules";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const isZh = isZhRequest(_request);
  const { slug } = await context.params;
  const mission = await getMissionBySlug(slug);

  if (!mission) {
    return NextResponse.json({ error: isZh ? "找不到指定任務。" : "Mission not found." }, { status: 404 });
  }

  return NextResponse.json({
    mission: {
      slug: mission.slug,
      title: mission.title,
      brand: mission.brand,
      product: mission.product,
      points: mission.points,
      difficulty: mission.difficulty,
      requiredLevel: getMissionRequiredLevel(mission.difficulty),
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