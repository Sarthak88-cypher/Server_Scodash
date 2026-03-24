import type { FastifyInstance } from "fastify";
import { scoreLinkedInSchema } from "../../types/api.js";
import { normalizeLinkedInUrl } from "../../lib/utils.js";
import { AppError, ErrorCode } from "../../lib/errors.js";
import { transformLinkedInProfile } from "../../services/enrichment/linkedin.js";
import { runEnrichmentPipeline } from "../../services/enrichment/pipeline.js";
import type { LinkedInMCPResponse } from "../../services/enrichment/linkedin.js";

export default async function linkedInScoreRoutes(fastify: FastifyInstance) {
  /**
   * POST /score/linkedin
   * Score a profile from a LinkedIn URL.
   *
   * Flow: URL → check cache → check DB → LinkedIn MCP → AI normalize → score
   */
  fastify.post("/score/linkedin", async (request, reply) => {
    const parsed = scoreLinkedInSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid LinkedIn URL", details: parsed.error.flatten() },
      });
    }

    const normalizedUrl = normalizeLinkedInUrl(parsed.data.url);

    // ─── Check Redis cache (24h TTL) ───────────────────────────────
    const cacheKey = `score:${normalizedUrl}`;
    const cached = await fastify.redis.get<string>(cacheKey);
    if (cached) {
      return reply.send({ data: JSON.parse(cached as string) });
    }

    // ─── Check if already scored in DB ─────────────────────────────
    const existing = await fastify.db.profile.findUnique({
      where: { linkedinUrl: normalizedUrl },
      include: {
        scoreSignals: true,
        segment: true,
        workExperiences: { include: { company: true }, orderBy: { startDate: "desc" } },
        education: { include: { institution: true } },
        skills: { include: { skill: true } },
      },
    });

    if (existing?.lastScoredAt) {
      const result = formatExistingScoreResult(existing);
      await fastify.redis.set(cacheKey, JSON.stringify(result), { ex: 86400 });
      return reply.send({ data: result });
    }

    // ─── Fetch from LinkedIn MCP ───────────────────────────────────
    // In Phase 1, the MCP call is made server-side.
    // This expects the LinkedIn MCP to be available as a tool.
    // For now, we'll attempt the MCP call and handle failures gracefully.
    let mcpResponse: LinkedInMCPResponse;
    try {
      mcpResponse = await fetchLinkedInViaMCP(normalizedUrl);
    } catch (error) {
      throw new AppError(
        ErrorCode.LINKEDIN_SCRAPE_FAILED,
        "Could not fetch LinkedIn profile. Try uploading a resume instead.",
        502,
        { url: normalizedUrl },
      );
    }

    // ─── Transform + Enrich + Score ────────────────────────────────
    const parsedProfile = transformLinkedInProfile(mcpResponse);
    const scoreResult = await runEnrichmentPipeline(fastify.db, parsedProfile, "SCRAPED", {
      linkedinUrl: normalizedUrl,
    });

    // Cache for 24 hours
    await fastify.redis.set(cacheKey, JSON.stringify(scoreResult), { ex: 86400 });

    return reply.send({ data: scoreResult });
  });
}

/**
 * Fetch LinkedIn profile data via MCP.
 * This is a placeholder for the actual MCP integration.
 * In production, this calls mcp__linkedin__get_person_profile.
 */
async function fetchLinkedInViaMCP(linkedinUrl: string): Promise<LinkedInMCPResponse> {
  // TODO: Integrate with actual LinkedIn MCP tool
  // For Phase 1 development, this will throw until the MCP is configured.
  // The resume path is the recommended primary path.
  throw new Error(
    `LinkedIn MCP not configured. Use resume upload instead. URL: ${linkedinUrl}`,
  );
}

function formatExistingScoreResult(profile: {
  id: string;
  fullName: string | null;
  headline: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  finalScore: number;
  percentile: number | null;
  rankInSegment: number | null;
  confidence: number;
  lastScoredAt: Date | null;
  segment: { roleCategory: string; yoeBand: string; geography: string } | null;
  scoreSignals: Array<{
    signalType: string;
    normalizedValue: number;
    weight: number;
    weightedValue: number;
    detailsJson: unknown;
  }>;
}) {
  return {
    profileId: profile.id,
    finalScore: profile.finalScore,
    percentile: profile.percentile,
    rankInSegment: profile.rankInSegment,
    segment: profile.segment
      ? { roleCategory: profile.segment.roleCategory, yoeBand: profile.segment.yoeBand, geography: profile.segment.geography }
      : null,
    confidence: profile.confidence,
    signals: profile.scoreSignals.map((s) => ({
      name: s.signalType.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      signalType: s.signalType,
      value: Math.round(s.weightedValue * 100),
      maxValue: Math.round(s.weight * 10000),
      normalizedScore: Math.round(s.normalizedValue),
      weight: s.weight,
      details: s.detailsJson ?? {},
    })),
    profile: {
      fullName: profile.fullName,
      headline: profile.headline,
      locationCity: profile.locationCity,
      locationCountry: profile.locationCountry,
      profileImageUrl: null,
    },
    scoredAt: profile.lastScoredAt?.toISOString() ?? new Date().toISOString(),
  };
}
