import type { FastifyInstance } from "fastify";
import { exploreQuerySchema } from "../../types/api.js";
import type { Prisma } from "@prisma/client";

export default async function exploreRoutes(fastify: FastifyInstance) {
  /**
   * GET /explore
   * Browse ranked profiles with filters.
   * Uses PostgreSQL FTS for Phase 1 (no Elasticsearch).
   */
  fastify.get("/explore", async (request, reply) => {
    const parsed = exploreQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: parsed.error.flatten() },
      });
    }

    const { role, yoeMin, yoeMax, location, minScore, sortBy, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    // Build Prisma where clause
    const where: Prisma.ProfileWhereInput = {
      finalScore: { gt: 0 },
    };

    if (minScore) {
      where.finalScore = { gte: minScore };
    }

    if (location) {
      where.OR = [
        { locationCity: { contains: location, mode: "insensitive" } },
        { locationCountry: { contains: location, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.segment = {
        roleCategory: { contains: role, mode: "insensitive" },
      };
    }

    if (yoeMin !== undefined || yoeMax !== undefined) {
      // Filter by YOE bands that overlap with the requested range
      const yoeBands: string[] = [];
      if (yoeMin === undefined || yoeMin < 3) yoeBands.push("0-2");
      if ((yoeMin === undefined || yoeMin < 6) && (yoeMax === undefined || yoeMax >= 3)) yoeBands.push("3-5");
      if ((yoeMin === undefined || yoeMin < 9) && (yoeMax === undefined || yoeMax >= 6)) yoeBands.push("6-8");
      if ((yoeMin === undefined || yoeMin < 13) && (yoeMax === undefined || yoeMax >= 9)) yoeBands.push("9-12");
      if (yoeMax === undefined || yoeMax >= 13) yoeBands.push("13+");

      if (yoeBands.length > 0) {
        where.segment = {
          ...((where.segment as object) ?? {}),
          yoeBand: { in: yoeBands },
        };
      }
    }

    // Order
    const orderBy: Prisma.ProfileOrderByWithRelationInput =
      sortBy === "recent"
        ? { createdAt: "desc" }
        : { finalScore: "desc" };

    // Query
    const [profiles, total] = await Promise.all([
      fastify.db.profile.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          segment: true,
          workExperiences: {
            where: { isCurrent: true },
            include: { company: { select: { name: true, tier: true } } },
            take: 1,
          },
          skills: {
            include: { skill: { select: { name: true, demandScore: true } } },
            orderBy: { skill: { demandScore: "desc" } },
            take: 5,
          },
        },
      }),
      fastify.db.profile.count({ where }),
    ]);

    const data = {
      profiles: profiles.map((p, idx) => ({
        id: p.id,
        rank: offset + idx + 1,
        fullName: p.fullName,
        headline: p.headline,
        locationCity: p.locationCity,
        locationCountry: p.locationCountry,
        finalScore: p.finalScore,
        percentile: p.percentile,
        segment: p.segment
          ? { roleCategory: p.segment.roleCategory, yoeBand: p.segment.yoeBand }
          : null,
        currentCompany: p.workExperiences[0]?.companyName ?? null,
        currentCompanyTier: p.workExperiences[0]?.company?.tier ?? null,
        topSkills: p.skills.map((s) => ({ name: s.skill.name, demand: s.skill.demandScore })),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return reply.send({ data });
  });
}
