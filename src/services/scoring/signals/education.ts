import type { SignalResult } from "../../../types/scoring.js";
import { INSTITUTION_TIER_SCORES } from "../../../types/scoring.js";
import { clamp } from "../../../lib/utils.js";

interface Edu {
  institutionName: string;
  degree: string | null;
  fieldOfStudy: string | null;
  institution: { tier: string; tierScore: number } | null;
}

/** Degree relevance to tech roles */
const DEGREE_RELEVANCE: Record<string, number> = {
  "b.tech": 1.0, "btech": 1.0, "be": 1.0, "bs": 0.9, "bsc": 0.9,
  "m.tech": 1.1, "mtech": 1.1, "ms": 1.1, "msc": 1.0, "me": 1.1,
  "phd": 1.15, "mba": 0.85,
  "bca": 0.8, "mca": 0.85,
  "bba": 0.6, "ba": 0.5, "bcom": 0.4,
};

/**
 * S3: Education Signal (weight: 10%)
 *
 * Evaluates institution tier × degree relevance.
 * Multiple degrees: highest scoring one wins.
 *
 * Score: 0-100
 */
export function calcEducation(education: Edu[], roleCategory: string): SignalResult {
  if (education.length === 0) {
    return {
      signalType: "education",
      rawValue: 30,
      normalizedValue: 30,
      details: { reason: "No education data" },
    };
  }

  let bestScore = 0;
  let bestEntry: { institution: string; tier: string; degree: string | null; score: number } | null = null;

  for (const edu of education) {
    const tier = edu.institution?.tier ?? "C";
    const tierScore = INSTITUTION_TIER_SCORES[tier] ?? 45;

    // Degree relevance multiplier
    const degreeKey = edu.degree?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    const relevance = DEGREE_RELEVANCE[degreeKey] ?? 0.7;

    // Field of study bonus for relevant fields
    const fieldBonus = isRelevantField(edu.fieldOfStudy, roleCategory) ? 1.1 : 1.0;

    const score = tierScore * relevance * fieldBonus;

    if (score > bestScore) {
      bestScore = score;
      bestEntry = {
        institution: edu.institutionName,
        tier,
        degree: edu.degree,
        score: Math.round(score),
      };
    }
  }

  const normalizedValue = clamp(Math.round(bestScore), 0, 100);

  return {
    signalType: "education",
    rawValue: bestScore,
    normalizedValue,
    details: {
      bestEntry,
      totalEntries: education.length,
    },
  };
}

function isRelevantField(fieldOfStudy: string | null, roleCategory: string): boolean {
  if (!fieldOfStudy) return false;
  const field = fieldOfStudy.toLowerCase();

  const techFields = ["computer", "software", "information technology", "it", "data science",
    "artificial intelligence", "machine learning", "electronics", "electrical",
    "mathematics", "statistics", "physics"];

  // For tech roles, STEM fields are relevant
  if (["Backend Engineer", "Frontend Engineer", "Full Stack Engineer", "Data Scientist",
    "ML Engineer", "DevOps Engineer", "Software Engineer", "Mobile Engineer", "QA Engineer",
    "Data Engineer"].includes(roleCategory)) {
    return techFields.some((f) => field.includes(f));
  }

  return true; // Non-tech roles: any field is okay
}
