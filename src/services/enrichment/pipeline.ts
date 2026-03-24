import type { PrismaClient } from "@prisma/client";
import type { ParsedProfile } from "../../types/profile.js";
import type { ScoreResult } from "../../types/scoring.js";
import { normalizeProfile } from "../ai/normalize.js";
import { recalculateScore } from "../scoring/engine.js";

/**
 * Full enrichment + scoring pipeline.
 * Takes a parsed profile (from LinkedIn MCP or resume), normalizes all entities,
 * creates/updates the DB profile, then scores it.
 */
export async function runEnrichmentPipeline(
  db: PrismaClient,
  parsedProfile: ParsedProfile,
  source: "SCRAPED" | "RESUME",
  opts: {
    linkedinUrl?: string;
    resumeHash?: string;
    resumeId?: string;
  } = {},
): Promise<ScoreResult> {
  // ─── Step 1: AI Normalize ────────────────────────────────────────
  const normalized = await normalizeProfile(db, parsedProfile);

  // ─── Step 2: Create or update profile ────────────────────────────
  const profile = await upsertProfile(db, parsedProfile, normalized, source, opts);

  // ─── Step 3: Link resume if applicable ───────────────────────────
  if (opts.resumeId) {
    await db.resume.update({
      where: { id: opts.resumeId },
      data: { profileId: profile.id },
    });
  }

  // ─── Step 4: Score ───────────────────────────────────────────────
  const trigger = source === "RESUME" ? "resume_score" : "linkedin_score";
  const scoreResult = await recalculateScore(db, profile.id, trigger);

  return scoreResult;
}

async function upsertProfile(
  db: PrismaClient,
  parsed: ParsedProfile,
  normalized: Awaited<ReturnType<typeof normalizeProfile>>,
  source: "SCRAPED" | "RESUME",
  opts: { linkedinUrl?: string; resumeHash?: string },
) {
  // Check for existing profile by LinkedIn URL or resume hash
  let existing = null;
  if (opts.linkedinUrl) {
    existing = await db.profile.findUnique({ where: { linkedinUrl: opts.linkedinUrl } });
  }
  if (!existing && opts.resumeHash) {
    existing = await db.profile.findUnique({ where: { resumeHash: opts.resumeHash } });
  }

  // Create or update profile
  const profileData = {
    fullName: parsed.fullName,
    headline: parsed.headline,
    locationCity: parsed.locationCity,
    locationCountry: parsed.locationCountry ?? "India",
    source,
    status: "ESTIMATED" as const,
    confidence: 1.0,
    ...(opts.linkedinUrl ? { linkedinUrl: opts.linkedinUrl } : {}),
    ...(opts.resumeHash ? { resumeHash: opts.resumeHash } : {}),
  };

  const profile = existing
    ? await db.profile.update({ where: { id: existing.id }, data: profileData })
    : await db.profile.create({ data: profileData });

  // ─── Upsert work experiences ─────────────────────────────────────
  // Delete old and recreate (simpler than diffing for Phase 1)
  await db.workExperience.deleteMany({ where: { profileId: profile.id } });

  for (const exp of parsed.workExperiences) {
    const resolvedCompany = normalized.resolvedCompanies.get(exp.companyName);
    const titleInfo = normalized.normalizedTitles.get(exp.title);

    await db.workExperience.create({
      data: {
        profileId: profile.id,
        companyName: exp.companyName,
        companyId: resolvedCompany?.id ?? null,
        title: exp.title,
        normalizedTitle: titleInfo?.normalizedTitle ?? null,
        roleLevel: titleInfo?.roleLevel ?? null,
        startDate: exp.startDate ? new Date(exp.startDate) : null,
        endDate: exp.endDate ? new Date(exp.endDate) : null,
        isCurrent: exp.isCurrent,
        location: exp.location,
        description: exp.description,
        source,
      },
    });
  }

  // ─── Upsert education ────────────────────────────────────────────
  await db.education.deleteMany({ where: { profileId: profile.id } });

  for (const edu of parsed.education) {
    const resolvedInst = normalized.resolvedInstitutions.get(edu.institutionName);

    await db.education.create({
      data: {
        profileId: profile.id,
        institutionName: edu.institutionName,
        institutionId: resolvedInst?.id ?? null,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy,
        startYear: edu.startYear,
        endYear: edu.endYear,
        source,
      },
    });
  }

  // ─── Upsert skills ──────────────────────────────────────────────
  await db.profileSkill.deleteMany({ where: { profileId: profile.id } });

  for (const skillName of parsed.skills) {
    const resolvedSkill = normalized.resolvedSkills.get(skillName);
    if (resolvedSkill) {
      await db.profileSkill.create({
        data: {
          profileId: profile.id,
          skillId: resolvedSkill.id,
          source,
        },
      });
    }
  }

  // ─── Upsert certifications ──────────────────────────────────────
  await db.certification.deleteMany({ where: { profileId: profile.id } });

  for (const cert of parsed.certifications) {
    await db.certification.create({
      data: {
        profileId: profile.id,
        name: cert.name,
        issuingOrg: cert.issuingOrg,
        issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
        credentialUrl: cert.credentialUrl,
        source,
      },
    });
  }

  // ─── Estimate CTC from salary benchmarks ────────────────────────
  await estimateCTC(db, profile.id, parsed, normalized);

  return profile;
}

/**
 * Estimate CTC by looking up salary benchmarks for the profile's
 * current role × company tier × location × YOE band.
 */
async function estimateCTC(
  db: PrismaClient,
  profileId: string,
  parsed: ParsedProfile,
  normalized: Awaited<ReturnType<typeof normalizeProfile>>,
) {
  const currentJob = parsed.workExperiences.find((w) => w.isCurrent) ?? parsed.workExperiences[0];
  if (!currentJob) return;

  const titleInfo = normalized.normalizedTitles.get(currentJob.title);
  const roleCategory = titleInfo?.normalizedTitle ?? "Software Engineer";

  // Simple YOE calculation
  const startDates = parsed.workExperiences
    .filter((w) => w.startDate)
    .map((w) => new Date(w.startDate!));
  const earliestStart = startDates.length > 0 ? Math.min(...startDates.map((d) => d.getTime())) : Date.now();
  const yoe = Math.max(0, (Date.now() - earliestStart) / (365.25 * 24 * 60 * 60 * 1000));

  const yoeBand = yoe < 2 ? "0-2" : yoe < 5 ? "3-5" : yoe < 8 ? "6-8" : yoe < 12 ? "9-12" : "13+";
  const location = parsed.locationCity ?? "India";

  // Look up salary benchmark
  const benchmark = await db.salaryBenchmark.findFirst({
    where: { roleCategory: { contains: roleCategory, mode: "insensitive" }, yoeBand, location: { contains: location, mode: "insensitive" } },
    orderBy: { sampleSize: "desc" },
  });

  if (benchmark?.medianCtc) {
    await db.ctcEstimate.create({
      data: {
        profileId,
        source: "salary_benchmark",
        minCtc: benchmark.minCtc,
        maxCtc: benchmark.maxCtc,
        estimatedCtc: benchmark.medianCtc,
        confidence: "medium",
        marketMedian: benchmark.medianCtc,
        marketRatio: 1.0, // Default to 1.0 when we don't have actual CTC
      },
    });
  }
}
