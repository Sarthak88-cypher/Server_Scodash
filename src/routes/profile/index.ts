import type { FastifyInstance } from "fastify";
import { profileParamsSchema } from "../../types/api.js";
import { notFound } from "../../lib/errors.js";
import { formatSignalName } from "../../lib/utils.js";

export default async function profileRoutes(fastify: FastifyInstance) {
  /**
   * GET /profile/:id
   * Get a fully scored profile with signal breakdown.
   */
  fastify.get("/profile/:id", async (request, reply) => {
    const params = profileParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid profile ID" },
      });
    }

    const profile = await fastify.db.profile.findUnique({
      where: { id: params.data.id },
      include: {
        workExperiences: {
          include: { company: { select: { id: true, name: true, tier: true } } },
          orderBy: { startDate: "desc" },
        },
        education: {
          include: { institution: { select: { id: true, name: true, tier: true } } },
        },
        skills: {
          include: { skill: { select: { id: true, name: true, demandScore: true, category: true } } },
        },
        certifications: true,
        scoreSignals: { orderBy: { weight: "desc" } },
        segment: true,
        scoreHistory: { orderBy: { createdAt: "desc" }, take: 10 },
        ctcEstimates: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!profile) {
      throw notFound("Profile not found");
    }

    const data = {
      id: profile.id,
      fullName: profile.fullName,
      headline: profile.headline,
      locationCity: profile.locationCity,
      locationCountry: profile.locationCountry,
      status: profile.status,
      source: profile.source,

      finalScore: profile.finalScore,
      percentile: profile.percentile,
      rankInSegment: profile.rankInSegment,
      confidence: profile.confidence,
      segment: profile.segment
        ? {
            roleCategory: profile.segment.roleCategory,
            yoeBand: profile.segment.yoeBand,
            geography: profile.segment.geography,
            profileCount: profile.segment.profileCount,
            avgScore: profile.segment.avgScore,
            medianScore: profile.segment.medianScore,
          }
        : null,

      signals: profile.scoreSignals.map((s) => ({
        name: formatSignalName(s.signalType),
        signalType: s.signalType,
        value: Math.round(s.weightedValue * 100),
        maxValue: Math.round(s.weight * 10000),
        normalizedScore: Math.round(s.normalizedValue),
        weight: s.weight,
        details: s.detailsJson ?? {},
      })),

      workExperiences: profile.workExperiences.map((w) => ({
        companyName: w.companyName,
        companyTier: w.company?.tier ?? null,
        title: w.title,
        normalizedTitle: w.normalizedTitle,
        roleLevel: w.roleLevel,
        startDate: w.startDate?.toISOString() ?? null,
        endDate: w.endDate?.toISOString() ?? null,
        isCurrent: w.isCurrent,
        location: w.location,
      })),

      education: profile.education.map((e) => ({
        institutionName: e.institutionName,
        institutionTier: e.institution?.tier ?? null,
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
        startYear: e.startYear,
        endYear: e.endYear,
      })),

      skills: profile.skills.map((s) => ({
        name: s.skill.name,
        demandScore: s.skill.demandScore,
        category: s.skill.category,
        endorsementCount: s.endorsementCount,
      })),

      certifications: profile.certifications.map((c) => ({
        name: c.name,
        issuingOrg: c.issuingOrg,
      })),

      scoreHistory: profile.scoreHistory.map((h) => ({
        score: h.score,
        delta: h.delta,
        trigger: h.trigger,
        createdAt: h.createdAt.toISOString(),
      })),

      scoredAt: profile.lastScoredAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
    };

    return reply.send({ data });
  });
}
