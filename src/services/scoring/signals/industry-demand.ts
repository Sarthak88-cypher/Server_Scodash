import type { PrismaClient } from "@prisma/client";
import type { SignalResult } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface WorkExp {
  companyName: string;
  isCurrent: boolean;
  company: { industry: string | null } | null;
}

/**
 * S8: Industry Demand Signal (weight: 5%)
 *
 * Evaluates whether the candidate works in a growing or declining industry.
 * Based on the Industry reference table (pre-seeded).
 *
 * Score: 0-100
 */
export async function calcIndustryDemand(
  db: PrismaClient,
  workExperiences: WorkExp[],
): Promise<SignalResult> {
  // Find the current/most recent industry
  const current = workExperiences.find((w) => w.isCurrent) ?? workExperiences[0];
  const industryName = current?.company?.industry;

  if (!industryName) {
    return {
      signalType: "industry_demand",
      rawValue: 50,
      normalizedValue: 50,
      details: { reason: "No industry data available" },
    };
  }

  // Look up industry in the reference table
  const industry = await db.industry.findFirst({
    where: {
      name: { equals: industryName, mode: "insensitive" },
    },
  });

  if (!industry) {
    return {
      signalType: "industry_demand",
      rawValue: 50,
      normalizedValue: 50,
      details: { reason: `Industry "${industryName}" not found in reference data` },
    };
  }

  // Convert demand_score (0-10) to 0-100 range
  const baseScore = industry.demandScore * 10;

  // Growth rate bonus/penalty: +5 per 10% growth, -5 per 10% decline
  const growthAdjustment = industry.growthRate * 0.5;

  const rawValue = baseScore + growthAdjustment;
  const normalizedValue = clamp(Math.round(rawValue), 0, 100);

  return {
    signalType: "industry_demand",
    rawValue,
    normalizedValue,
    details: {
      industry: industry.name,
      demandScore: industry.demandScore,
      growthRate: industry.growthRate,
      trendLabel: industry.trendLabel,
    },
  };
}
