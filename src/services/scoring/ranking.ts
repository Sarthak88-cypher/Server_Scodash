import type { PrismaClient } from "@prisma/client";
import { calculateYOE, yoeToBand } from "../../lib/utils.js";

interface RankingResult {
  segmentId: string;
  roleCategory: string;
  yoeBand: string;
  geography: string;
  rank: number;
  percentile: number;
}

/**
 * Update a profile's ranking within its segment.
 * Segments: {roleCategory, yoeBand, geography}
 *
 * Creates the segment if it doesn't exist, then calculates rank and percentile.
 */
export async function updateRanking(
  db: PrismaClient,
  profileId: string,
  roleCategory: string,
  workExperiences: Array<{ startDate: Date | null; endDate: Date | null; isCurrent: boolean }>,
  geography: string,
): Promise<RankingResult | null> {
  const yoe = calculateYOE(workExperiences);
  const yoeBand = yoeToBand(yoe);

  // Upsert segment
  const segment = await db.segment.upsert({
    where: {
      roleCategory_yoeBand_geography: { roleCategory, yoeBand, geography },
    },
    update: {},
    create: { roleCategory, yoeBand, geography },
  });

  // Count profiles in this segment with scores
  const profilesInSegment = await db.profile.findMany({
    where: { segmentId: segment.id, finalScore: { gt: 0 } },
    select: { id: true, finalScore: true },
    orderBy: { finalScore: "desc" },
  });

  // Assign to segment
  await db.profile.update({
    where: { id: profileId },
    data: { segmentId: segment.id },
  });

  // Find this profile's rank
  const rank = profilesInSegment.findIndex((p) => p.id === profileId) + 1;
  const total = profilesInSegment.length;
  const percentile = total > 0 ? ((total - rank) / total) * 100 : 0;

  // Update segment statistics
  const scores = profilesInSegment.map((p) => p.finalScore).sort((a, b) => a - b);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
  const medianScore = scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0;
  const p90Score = scores.length > 0 ? scores[Math.floor(scores.length * 0.9)] : 0;

  await db.segment.update({
    where: { id: segment.id },
    data: {
      profileCount: total,
      avgScore,
      medianScore,
      p90Score,
      lastRankedAt: new Date(),
    },
  });

  return {
    segmentId: segment.id,
    roleCategory,
    yoeBand,
    geography,
    rank: rank > 0 ? rank : 1,
    percentile: Math.round(percentile * 10) / 10,
  };
}
