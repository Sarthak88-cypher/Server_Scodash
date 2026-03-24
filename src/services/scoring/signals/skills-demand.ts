import type { SignalResult } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface ProfileSkillEntry {
  endorsementCount: number;
  skill: {
    name: string;
    demandScore: number; // 0-10
    demandTrend: number; // -1 to +1
    category: string | null;
  };
}

/**
 * S4: Skills Demand Signal (weight: 17%)
 *
 * Evaluates the market relevance of the candidate's skills.
 * - Weighted average of skill demand scores
 * - Endorsement count as a credibility multiplier
 * - Bonus for trending skills (positive demand_trend)
 * - Rare high-demand skills get extra weight
 *
 * Score: 0-100
 */
export function calcSkillsDemand(skills: ProfileSkillEntry[]): SignalResult {
  if (skills.length === 0) {
    return {
      signalType: "skills_demand",
      rawValue: 0,
      normalizedValue: 0,
      details: { reason: "No skills data" },
    };
  }

  // Weight skills by endorsement count (min 1 to avoid zero weight)
  const totalEndorsements = skills.reduce((sum, s) => sum + Math.max(1, s.endorsementCount), 0);

  let weightedDemand = 0;
  let trendBonus = 0;
  const topSkills: Array<{ name: string; demand: number; trend: number }> = [];

  for (const entry of skills) {
    const weight = Math.max(1, entry.endorsementCount) / totalEndorsements;
    const demand = entry.skill.demandScore; // 0-10

    weightedDemand += demand * weight;

    // Trend bonus: positive trend adds up to 5% per skill
    if (entry.skill.demandTrend > 0) {
      trendBonus += entry.skill.demandTrend * 5 * weight;
    }

    topSkills.push({
      name: entry.skill.name,
      demand: entry.skill.demandScore,
      trend: entry.skill.demandTrend,
    });
  }

  // Diversity bonus: having skills across multiple categories
  const categories = new Set(skills.map((s) => s.skill.category).filter(Boolean));
  const diversityBonus = Math.min(10, categories.size * 2);

  // Depth bonus: having many high-demand skills (>7/10)
  const highDemandCount = skills.filter((s) => s.skill.demandScore > 7).length;
  const depthBonus = Math.min(10, highDemandCount * 3);

  // Convert 0-10 demand to 0-100 scale + bonuses
  const rawValue = weightedDemand * 8 + trendBonus + diversityBonus + depthBonus;
  const normalizedValue = clamp(Math.round(rawValue), 0, 100);

  // Sort top skills by demand for display
  topSkills.sort((a, b) => b.demand - a.demand);

  return {
    signalType: "skills_demand",
    rawValue,
    normalizedValue,
    details: {
      weightedDemand: Math.round(weightedDemand * 10) / 10,
      trendBonus: Math.round(trendBonus * 10) / 10,
      diversityBonus,
      depthBonus,
      topSkills: topSkills.slice(0, 10),
      totalSkills: skills.length,
      categories: [...categories],
    },
  };
}
