import type { SignalResult } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface WorkExp {
  companyName: string;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
}

/**
 * S7: Stability Signal (weight: 5%)
 *
 * Measures balanced tenure — not too short (job-hopper), not too stagnant.
 * Optimal tenure: 2-4 years per role.
 *
 * Scoring:
 * - Avg tenure 0-1 year: penalty (job-hopper)
 * - Avg tenure 1-2 years: fair
 * - Avg tenure 2-4 years: optimal
 * - Avg tenure 4-6 years: good (but slightly less dynamic)
 * - Avg tenure >6 years: stagnation risk (unless current role)
 *
 * Score: 0-100
 */
export function calcStability(workExperiences: WorkExp[]): SignalResult {
  const withDates = workExperiences.filter((w) => w.startDate != null);

  if (withDates.length === 0) {
    return {
      signalType: "stability",
      rawValue: 50,
      normalizedValue: 50,
      details: { reason: "No dated work experiences" },
    };
  }

  // Calculate tenure for each role (in years)
  const tenures: Array<{ company: string; years: number; isCurrent: boolean }> = [];
  for (const exp of withDates) {
    const start = exp.startDate!;
    const end = exp.isCurrent ? new Date() : (exp.endDate ?? new Date());
    const years = Math.max(0, (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    tenures.push({ company: exp.companyName, years, isCurrent: exp.isCurrent });
  }

  // Average tenure (exclude current role from stagnation penalty)
  const completedTenures = tenures.filter((t) => !t.isCurrent);
  const avgTenure = completedTenures.length > 0
    ? completedTenures.reduce((sum, t) => sum + t.years, 0) / completedTenures.length
    : tenures[0].years;

  // Score based on average tenure
  let score: number;
  if (avgTenure < 0.5) {
    score = 15; // Extreme job-hopping
  } else if (avgTenure < 1.0) {
    score = 30 + (avgTenure - 0.5) * 30; // 30-45
  } else if (avgTenure < 2.0) {
    score = 45 + (avgTenure - 1.0) * 25; // 45-70
  } else if (avgTenure < 4.0) {
    score = 70 + (avgTenure - 2.0) * 15; // 70-100 (optimal zone)
  } else if (avgTenure < 6.0) {
    score = 85 - (avgTenure - 4.0) * 5; // 85-75
  } else {
    score = 60 - Math.min(20, (avgTenure - 6.0) * 5); // Declining
  }

  // Short stint penalty: if more than 50% of roles are <1 year
  const shortStints = completedTenures.filter((t) => t.years < 1.0).length;
  if (completedTenures.length > 0 && shortStints / completedTenures.length > 0.5) {
    score -= 15;
  }

  // Consistency bonus: low variance in tenure indicates reliability
  if (completedTenures.length >= 3) {
    const variance = calcVariance(completedTenures.map((t) => t.years));
    if (variance < 0.5) score += 5; // Very consistent
  }

  const normalizedValue = clamp(Math.round(score), 0, 100);

  return {
    signalType: "stability",
    rawValue: avgTenure,
    normalizedValue,
    details: {
      avgTenureYears: Math.round(avgTenure * 10) / 10,
      totalRoles: tenures.length,
      shortStints,
      tenures: tenures.map((t) => ({
        company: t.company,
        years: Math.round(t.years * 10) / 10,
        isCurrent: t.isCurrent,
      })),
    },
  };
}

function calcVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}
