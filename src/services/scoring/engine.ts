import type { PrismaClient } from "@prisma/client";
import type { SignalResult, ScoreResult, SignalBreakdown } from "../../types/scoring.js";
import { SIGNAL_WEIGHTS } from "../../types/scoring.js";
import { formatSignalName, guessRoleCategory } from "../../lib/utils.js";
import { calcCompanyTier } from "./signals/company-tier.js";
import { calcRoleProgression } from "./signals/role-progression.js";
import { calcEducation } from "./signals/education.js";
import { calcSkillsDemand } from "./signals/skills-demand.js";
import { calcTrajectoryMomentum } from "./signals/trajectory-momentum.js";
import { calcCtcMarketRatio } from "./signals/ctc-market-ratio.js";
import { calcStability } from "./signals/stability.js";
import { calcIndustryDemand } from "./signals/industry-demand.js";
import { updateRanking } from "./ranking.js";

/**
 * Main scoring orchestrator.
 * Loads all profile relations, calculates 8 signals, computes composite score,
 * persists results, and updates segment ranking.
 */
export async function recalculateScore(
  db: PrismaClient,
  profileId: string,
  trigger: string,
): Promise<ScoreResult> {
  // Load profile with all relations
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      workExperiences: { include: { company: true }, orderBy: { startDate: "desc" } },
      education: { include: { institution: true } },
      skills: { include: { skill: true } },
      ctcEstimates: true,
      segment: true,
    },
  });

  const roleCategory = guessRoleCategory(profile.workExperiences);

  // Calculate all 8 signals (industry demand is async because it queries DB)
  const [s1, s2, s3, s4, s5, s6, s7, s8] = await Promise.all([
    Promise.resolve(calcCompanyTier(profile.workExperiences)),
    Promise.resolve(calcRoleProgression(profile.workExperiences)),
    Promise.resolve(calcEducation(profile.education, roleCategory)),
    Promise.resolve(calcSkillsDemand(profile.skills)),
    Promise.resolve(calcTrajectoryMomentum(profile.workExperiences)),
    Promise.resolve(calcCtcMarketRatio(profile.ctcEstimates)),
    Promise.resolve(calcStability(profile.workExperiences)),
    calcIndustryDemand(db, profile.workExperiences),
  ]);

  const signals: SignalResult[] = [s1, s2, s3, s4, s5, s6, s7, s8];

  // ─── Compute weighted composite score ────────────────────────────
  // Each signal: normalizedValue is 0-100, weight sums to 1.0
  // Raw score = Σ(normalizedValue × weight) → range 0-100
  // Final score = rawScore × confidence × 100 → range 0-10,000
  const rawScore = signals.reduce((sum, signal) => {
    const weight = SIGNAL_WEIGHTS[signal.signalType] ?? 0;
    return sum + signal.normalizedValue * weight;
  }, 0);

  const confidenceMult = profile.confidence;
  const finalScore = Math.round(Math.min(rawScore * confidenceMult * 100, 10000));

  // ─── Persist signals (upsert each) ──────────────────────────────
  await Promise.all(
    signals.map((signal) => {
      const weight = SIGNAL_WEIGHTS[signal.signalType] ?? 0;
      return db.scoreSignal.upsert({
        where: { profileId_signalType: { profileId, signalType: signal.signalType } },
        update: {
          rawValue: signal.rawValue,
          normalizedValue: signal.normalizedValue,
          weight,
          weightedValue: signal.normalizedValue * weight,
          detailsJson: JSON.parse(JSON.stringify(signal.details)),
          calculatedAt: new Date(),
        },
        create: {
          profileId,
          signalType: signal.signalType,
          rawValue: signal.rawValue,
          normalizedValue: signal.normalizedValue,
          weight,
          weightedValue: signal.normalizedValue * weight,
          detailsJson: JSON.parse(JSON.stringify(signal.details)),
        },
      });
    }),
  );

  // ─── Update profile score ────────────────────────────────────────
  const previousScore = profile.finalScore;
  await db.profile.update({
    where: { id: profileId },
    data: { finalScore, lastScoredAt: new Date() },
  });

  // ─── Record score history ────────────────────────────────────────
  await db.scoreHistory.create({
    data: {
      profileId,
      score: finalScore,
      segmentId: profile.segmentId,
      trigger,
      delta: finalScore - previousScore,
      snapshotJson: signals.reduce(
        (acc, s) => ({ ...acc, [s.signalType]: { normalized: s.normalizedValue, raw: s.rawValue } }),
        {},
      ),
    },
  });

  // ─── Update segment ranking ──────────────────────────────────────
  let rankInSegment: number | null = null;
  let percentile: number | null = null;

  const ranking = await updateRanking(db, profileId, roleCategory, profile.workExperiences, profile.locationCountry ?? "India");
  if (ranking) {
    rankInSegment = ranking.rank;
    percentile = ranking.percentile;
    await db.profile.update({
      where: { id: profileId },
      data: {
        segmentId: ranking.segmentId,
        rankInSegment: ranking.rank,
        percentile: ranking.percentile,
      },
    });
  }

  // ─── Build response ──────────────────────────────────────────────
  const signalBreakdowns: SignalBreakdown[] = signals.map((s) => {
    const weight = SIGNAL_WEIGHTS[s.signalType] ?? 0;
    return {
      name: formatSignalName(s.signalType),
      signalType: s.signalType,
      value: Math.round(s.normalizedValue * weight * 100),
      maxValue: Math.round(weight * 10000),
      normalizedScore: Math.round(s.normalizedValue),
      weight,
      details: s.details,
    };
  });

  const segment = ranking
    ? { roleCategory: ranking.roleCategory, yoeBand: ranking.yoeBand, geography: ranking.geography }
    : null;

  return {
    profileId,
    finalScore,
    percentile,
    rankInSegment,
    segment,
    confidence: profile.confidence,
    signals: signalBreakdowns,
    profile: {
      fullName: profile.fullName,
      headline: profile.headline,
      locationCity: profile.locationCity,
      locationCountry: profile.locationCountry,
      profileImageUrl: null,
    },
    scoredAt: new Date().toISOString(),
  };
}
