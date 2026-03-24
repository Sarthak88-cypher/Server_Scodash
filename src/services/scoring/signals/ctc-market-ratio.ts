import type { SignalResult } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface CtcEstimateEntry {
  source: string;
  estimatedCtc: number | null;
  marketMedian: number | null;
  marketRatio: number | null;
}

/**
 * S6: CTC Market Ratio Signal (weight: 10%)
 *
 * Measures how the candidate's compensation compares to market median.
 * - Ratio > 1.0: paid above market (good signal — employer values them)
 * - Ratio = 1.0: at market rate
 * - Ratio < 1.0: underpaid (could indicate room for growth or low negotiation)
 *
 * Score: 0-100
 */
export function calcCtcMarketRatio(
  ctcEstimates: CtcEstimateEntry[],
): SignalResult {
  if (ctcEstimates.length === 0 || ctcEstimates.every((e) => e.marketRatio == null)) {
    // No CTC data — default to neutral score
    return {
      signalType: "ctc_market_ratio",
      rawValue: 50,
      normalizedValue: 50,
      details: { reason: "No compensation data available" },
    };
  }

  // Use the most reliable estimate (prioritize user-reported, then AI triangulation)
  const prioritized = [...ctcEstimates]
    .filter((e) => e.marketRatio != null)
    .sort((a, b) => {
      const priority: Record<string, number> = {
        user_reported: 3,
        ai_triangulation: 2,
        salary_benchmark: 1,
      };
      return (priority[b.source] ?? 0) - (priority[a.source] ?? 0);
    });

  const best = prioritized[0];
  const ratio = best.marketRatio!;

  // Scoring curve:
  // ratio 0.5 → score 20 (heavily underpaid)
  // ratio 0.8 → score 40
  // ratio 1.0 → score 60 (at market)
  // ratio 1.2 → score 75
  // ratio 1.5 → score 90 (well above market)
  // ratio 2.0+ → score 100

  let score: number;
  if (ratio <= 0.5) {
    score = 20;
  } else if (ratio <= 1.0) {
    // Linear from 20 to 60 as ratio goes from 0.5 to 1.0
    score = 20 + ((ratio - 0.5) / 0.5) * 40;
  } else if (ratio <= 1.5) {
    // Linear from 60 to 90 as ratio goes from 1.0 to 1.5
    score = 60 + ((ratio - 1.0) / 0.5) * 30;
  } else {
    // Diminishing returns above 1.5x
    score = Math.min(100, 90 + (ratio - 1.5) * 20);
  }

  const normalizedValue = clamp(Math.round(score), 0, 100);

  return {
    signalType: "ctc_market_ratio",
    rawValue: ratio,
    normalizedValue,
    details: {
      marketRatio: Math.round(ratio * 100) / 100,
      estimatedCtc: best.estimatedCtc,
      marketMedian: best.marketMedian,
      source: best.source,
    },
  };
}
