import type { PrismaClient } from "@prisma/client";
import type { ParsedProfile } from "../../types/profile.js";
import { matchCompany } from "./company-matcher.js";
import { matchInstitution } from "./institution-matcher.js";
import { matchSkills } from "./skills-matcher.js";
import { normalizeTitle } from "./title-normalizer.js";

export interface NormalizedProfile {
  parsedProfile: ParsedProfile;
  resolvedCompanies: Map<string, { id: string; name: string; tier: string; tierScore: number } | null>;
  resolvedInstitutions: Map<string, { id: string; name: string; tier: string; tierScore: number } | null>;
  resolvedSkills: Map<string, { id: string; name: string; demandScore: number } | null>;
  normalizedTitles: Map<string, { normalizedTitle: string; roleLevel: number }>;
}

/**
 * Run the full AI normalization pipeline on a parsed profile.
 * Resolves companies, institutions, skills, and titles via the 3-tier system.
 */
export async function normalizeProfile(
  db: PrismaClient,
  profile: ParsedProfile,
): Promise<NormalizedProfile> {
  // Run all normalizations concurrently for performance
  const [companies, institutions, skills, titles] = await Promise.all([
    // Resolve companies
    Promise.all(
      profile.workExperiences.map(async (exp) => ({
        rawName: exp.companyName,
        match: await matchCompany(db, exp.companyName),
      })),
    ),

    // Resolve institutions
    Promise.all(
      profile.education.map(async (edu) => ({
        rawName: edu.institutionName,
        match: await matchInstitution(db, edu.institutionName),
      })),
    ),

    // Resolve skills
    matchSkills(db, profile.skills),

    // Normalize titles
    Promise.all(
      profile.workExperiences.map(async (exp) => ({
        rawTitle: exp.title,
        normalized: await normalizeTitle(exp.title),
      })),
    ),
  ]);

  // Build lookup maps
  const resolvedCompanies = new Map(
    companies.map((c) => [c.rawName, c.match ? { id: c.match.id, name: c.match.name, tier: c.match.tier, tierScore: c.match.tierScore } : null]),
  );

  const resolvedInstitutions = new Map(
    institutions.map((i) => [i.rawName, i.match ? { id: i.match.id, name: i.match.name, tier: i.match.tier, tierScore: i.match.tierScore } : null]),
  );

  const resolvedSkills = new Map(
    profile.skills.map((name, idx) => {
      const match = skills[idx];
      return [name, match ? { id: match.id, name: match.name, demandScore: match.demandScore } : null];
    }),
  );

  const normalizedTitles = new Map(
    titles.map((t) => [t.rawTitle, t.normalized]),
  );

  return {
    parsedProfile: profile,
    resolvedCompanies,
    resolvedInstitutions,
    resolvedSkills,
    normalizedTitles,
  };
}
