import type { SignalResult } from "../../../types/scoring.js";
import { COMPANY_TIER_SCORES } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface WorkExp {
  companyName: string;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  company: { tier: string; tierScore: number } | null;
}

/**
 * S1: Company Tier Signal (weight: 15%)
 *
 * Evaluates the quality of companies worked at.
 * Weights recent experience more heavily:
 *   - Current job: 50% weight
 *   - Previous job: 30% weight
 *   - Older jobs: 20% weight (split equally)
 *
 * Score: 0-100
 */
export function calcCompanyTier(workExperiences: WorkExp[]): SignalResult {
  if (workExperiences.length === 0) {
    return {
      signalType: "company_tier",
      rawValue: 0,
      normalizedValue: 0,
      details: { reason: "No work experience" },
    };
  }

  // Sort by start date descending (most recent first)
  const sorted = [...workExperiences].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    const aDate = a.startDate?.getTime() ?? 0;
    const bDate = b.startDate?.getTime() ?? 0;
    return bDate - aDate;
  });

  // Assign recency weights
  const weights: number[] = [];
  if (sorted.length === 1) {
    weights.push(1.0);
  } else if (sorted.length === 2) {
    weights.push(0.6, 0.4);
  } else {
    weights.push(0.5, 0.3);
    const remainingWeight = 0.2;
    const olderCount = sorted.length - 2;
    for (let i = 0; i < olderCount; i++) {
      weights.push(remainingWeight / olderCount);
    }
  }

  // Calculate weighted tier score
  let weightedScore = 0;
  const breakdown: Array<{ company: string; tier: string; score: number; weight: number }> = [];

  for (let i = 0; i < sorted.length; i++) {
    const exp = sorted[i];
    const tier = exp.company?.tier ?? "D";
    const score = COMPANY_TIER_SCORES[tier] ?? 35;
    const weight = weights[i];

    weightedScore += score * weight;
    breakdown.push({
      company: exp.companyName,
      tier,
      score,
      weight,
    });
  }

  const normalizedValue = clamp(Math.round(weightedScore), 0, 100);

  return {
    signalType: "company_tier",
    rawValue: weightedScore,
    normalizedValue,
    details: {
      breakdown,
      highestTier: sorted[0]?.company?.tier ?? "D",
    },
  };
}
