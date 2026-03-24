import type { FastifyInstance } from "fastify";
import { compareQuerySchema } from "../../types/api.js";
import { notFound } from "../../lib/errors.js";
import { formatSignalName } from "../../lib/utils.js";

export default async function compareRoutes(fastify: FastifyInstance) {
  /**
   * GET /compare?ids=uuid1,uuid2
   * Compare two scored profiles side-by-side.
   */
  fastify.get("/compare", async (request, reply) => {
    const parsed = compareQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Provide exactly 2 profile IDs: ?ids=uuid1,uuid2" },
      });
    }

    const [id1, id2] = parsed.data.ids;

    // Fetch both profiles in parallel
    const [profile1, profile2] = await Promise.all([
      fastify.db.profile.findUnique({
        where: { id: id1 },
        include: {
          scoreSignals: true,
          segment: true,
          workExperiences: { include: { company: true }, orderBy: { startDate: "desc" }, take: 3 },
          skills: { include: { skill: true }, take: 10 },
        },
      }),
      fastify.db.profile.findUnique({
        where: { id: id2 },
        include: {
          scoreSignals: true,
          segment: true,
          workExperiences: { include: { company: true }, orderBy: { startDate: "desc" }, take: 3 },
          skills: { include: { skill: true }, take: 10 },
        },
      }),
    ]);

    if (!profile1) throw notFound(`Profile ${id1} not found`);
    if (!profile2) throw notFound(`Profile ${id2} not found`);

    const formatProfile = (p: NonNullable<typeof profile1>) => ({
      id: p.id,
      fullName: p.fullName,
      headline: p.headline,
      locationCity: p.locationCity,
      finalScore: p.finalScore,
      percentile: p.percentile,
      rankInSegment: p.rankInSegment,
      segment: p.segment
        ? { roleCategory: p.segment.roleCategory, yoeBand: p.segment.yoeBand, geography: p.segment.geography }
        : null,
      signals: p.scoreSignals.map((s) => ({
        name: formatSignalName(s.signalType),
        signalType: s.signalType,
        value: Math.round(s.weightedValue * 100),
        maxValue: Math.round(s.weight * 10000),
        normalizedScore: Math.round(s.normalizedValue),
      })),
      currentCompany: p.workExperiences.find((w) => w.isCurrent)?.companyName ?? p.workExperiences[0]?.companyName ?? null,
      currentTitle: p.workExperiences.find((w) => w.isCurrent)?.title ?? p.workExperiences[0]?.title ?? null,
      topSkills: p.skills.map((s) => s.skill.name).slice(0, 5),
    });

    const p1 = formatProfile(profile1);
    const p2 = formatProfile(profile2);

    // Calculate deltas
    const signalDeltas = p1.signals.map((s1) => {
      const s2 = p2.signals.find((s) => s.signalType === s1.signalType);
      return {
        name: s1.name,
        signalType: s1.signalType,
        delta: s1.value - (s2?.value ?? 0),
      };
    });

    return reply.send({
      data: {
        profiles: [p1, p2],
        deltas: {
          finalScore: p1.finalScore - p2.finalScore,
          signals: signalDeltas,
        },
      },
    });
  });
}
