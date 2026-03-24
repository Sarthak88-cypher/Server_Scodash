import type { SignalResult } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface WorkExp {
  title: string;
  roleLevel: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  companyName: string;
}

/**
 * S2: Role Progression Signal (weight: 18%)
 *
 * Measures speed and quality of career advancement.
 * - Fast promotion (role level increase in <2 years) = high score
 * - Internal promotion (same company) = bonus
 * - Lateral moves = neutral
 * - Demotion = penalty
 *
 * Score: 0-100
 */
export function calcRoleProgression(workExperiences: WorkExp[]): SignalResult {
  const withLevels = workExperiences
    .filter((w) => w.roleLevel != null && w.startDate != null)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

  if (withLevels.length < 2) {
    // Can't measure progression with less than 2 data points
    const baseScore = withLevels.length === 1 ? (withLevels[0].roleLevel ?? 3) * 10 : 30;
    return {
      signalType: "role_progression",
      rawValue: baseScore,
      normalizedValue: clamp(baseScore, 0, 100),
      details: { reason: "Insufficient data for progression analysis", dataPoints: withLevels.length },
    };
  }

  const transitions: Array<{
    from: string;
    to: string;
    levelDelta: number;
    yearsElapsed: number;
    sameCompany: boolean;
  }> = [];

  let totalProgressionScore = 0;

  for (let i = 1; i < withLevels.length; i++) {
    const prev = withLevels[i - 1];
    const curr = withLevels[i];

    const levelDelta = (curr.roleLevel ?? 3) - (prev.roleLevel ?? 3);
    const startPrev = prev.startDate!;
    const startCurr = curr.startDate!;
    const yearsElapsed = Math.max(0.5, (startCurr.getTime() - startPrev.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const sameCompany = prev.companyName.toLowerCase() === curr.companyName.toLowerCase();

    // Score each transition
    let transitionScore = 0;

    if (levelDelta > 0) {
      // Promotion — faster is better
      const speed = levelDelta / yearsElapsed;
      transitionScore = Math.min(30, speed * 15);

      // Internal promotion bonus (harder to get, more meaningful)
      if (sameCompany) transitionScore *= 1.2;
    } else if (levelDelta === 0) {
      // Lateral move — slightly positive if company change (broader experience)
      transitionScore = sameCompany ? 0 : 5;
    } else {
      // Demotion — penalty, but not catastrophic
      transitionScore = levelDelta * 5; // negative
    }

    totalProgressionScore += transitionScore;
    transitions.push({
      from: prev.title,
      to: curr.title,
      levelDelta,
      yearsElapsed: Math.round(yearsElapsed * 10) / 10,
      sameCompany,
    });
  }

  // Normalize: base score from current level + progression score
  const currentLevel = withLevels[withLevels.length - 1].roleLevel ?? 3;
  const baseFromLevel = currentLevel * 8; // 1→8, 5→40, 10→80

  const rawValue = baseFromLevel + totalProgressionScore;
  const normalizedValue = clamp(Math.round(rawValue), 0, 100);

  return {
    signalType: "role_progression",
    rawValue,
    normalizedValue,
    details: {
      transitions,
      currentLevel,
      totalProgressionScore: Math.round(totalProgressionScore * 10) / 10,
    },
  };
}
