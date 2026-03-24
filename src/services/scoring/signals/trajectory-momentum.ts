import type { SignalResult } from "../../../types/scoring.js";
import { COMPANY_TIER_SCORES } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface WorkExp {
  companyName: string;
  title: string;
  roleLevel: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  company: { tier: string; tierScore: number } | null;
}

/**
 * S5: Trajectory Momentum Signal (weight: 20% — highest weight)
 *
 * Measures the RATE of upward career movement.
 * This is the most important signal — it makes the system aspirational.
 *
 * A Tier-3 grad who went from TCS to Amazon in 3 years scores higher
 * than an IITian who's been at Google since campus placement.
 *
 * Components:
 * 1. Company tier delta over time (biggest impact)
 * 2. Role level delta over time
 * 3. Acceleration bonus (speeding up trajectory)
 * 4. Stagnation penalty (no movement in >3 years)
 *
 * Score: 0-100
 */
export function calcTrajectoryMomentum(workExperiences: WorkExp[]): SignalResult {
  const sorted = [...workExperiences]
    .filter((w) => w.startDate != null)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

  if (sorted.length < 2) {
    // Single job — score based on current position only
    const current = sorted[0];
    if (!current) {
      return { signalType: "trajectory_momentum", rawValue: 0, normalizedValue: 0, details: { reason: "No work data" } };
    }
    const tierScore = COMPANY_TIER_SCORES[current.company?.tier ?? "D"] ?? 35;
    const levelScore = (current.roleLevel ?? 3) * 5;
    const base = Math.round((tierScore * 0.4 + levelScore) * 0.5);
    return {
      signalType: "trajectory_momentum",
      rawValue: base,
      normalizedValue: clamp(base, 0, 100),
      details: { reason: "Single position — limited trajectory data", position: current.title },
    };
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalYears = Math.max(1, (last.startDate!.getTime() - first.startDate!.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  // ─── Company Tier Delta ──────────────────────────────────────────
  const firstTierScore = COMPANY_TIER_SCORES[first.company?.tier ?? "D"] ?? 35;
  const lastTierScore = COMPANY_TIER_SCORES[last.company?.tier ?? "D"] ?? 35;
  const tierDelta = lastTierScore - firstTierScore; // Can be negative
  const tierVelocity = tierDelta / totalYears; // Points per year

  // ─── Role Level Delta ────────────────────────────────────────────
  const firstLevel = first.roleLevel ?? 3;
  const lastLevel = last.roleLevel ?? 3;
  const levelDelta = lastLevel - firstLevel;
  const levelVelocity = levelDelta / totalYears;

  // ─── Acceleration (second derivative) ────────────────────────────
  // Check if trajectory is accelerating in the latter half
  let acceleration = 0;
  if (sorted.length >= 3) {
    const midIdx = Math.floor(sorted.length / 2);
    const midPoint = sorted[midIdx];
    const midYears = Math.max(0.5, (midPoint.startDate!.getTime() - first.startDate!.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const secondHalfYears = Math.max(0.5, totalYears - midYears);

    const midTierScore = COMPANY_TIER_SCORES[midPoint.company?.tier ?? "D"] ?? 35;
    const firstHalfVelocity = (midTierScore - firstTierScore) / midYears;
    const secondHalfVelocity = (lastTierScore - midTierScore) / secondHalfYears;

    acceleration = secondHalfVelocity - firstHalfVelocity;
  }

  // ─── Stagnation Check ────────────────────────────────────────────
  let stagnationPenalty = 0;
  if (last.isCurrent && last.startDate) {
    const currentTenure = (Date.now() - last.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    // No penalty for reasonable tenure; penalize if same level for >4 years
    if (currentTenure > 4 && levelDelta === 0) {
      stagnationPenalty = Math.min(15, (currentTenure - 4) * 3);
    }
  }

  // ─── Composite Score ─────────────────────────────────────────────
  // Base from current position (where you ended up matters)
  const positionBase = lastTierScore * 0.3 + lastLevel * 5;

  // Trajectory component (the journey matters more)
  const trajectoryScore =
    tierVelocity * 3 +  // Tier velocity: +3 points per tier-point/year
    levelVelocity * 8 + // Level velocity: +8 points per level/year
    acceleration * 2;   // Acceleration bonus

  const rawValue = positionBase + trajectoryScore - stagnationPenalty;
  const normalizedValue = clamp(Math.round(rawValue), 0, 100);

  return {
    signalType: "trajectory_momentum",
    rawValue,
    normalizedValue,
    details: {
      totalYears: Math.round(totalYears * 10) / 10,
      tierDelta,
      tierVelocity: Math.round(tierVelocity * 100) / 100,
      levelDelta,
      levelVelocity: Math.round(levelVelocity * 100) / 100,
      acceleration: Math.round(acceleration * 100) / 100,
      stagnationPenalty,
      startPosition: `${first.title} at ${first.companyName}`,
      currentPosition: `${last.title} at ${last.companyName}`,
    },
  };
}
