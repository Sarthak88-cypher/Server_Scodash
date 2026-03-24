import type { FastifyInstance } from "fastify";
import { AppError, ErrorCode } from "../../lib/errors.js";
import { processResume } from "../../services/enrichment/resume.js";
import { runEnrichmentPipeline } from "../../services/enrichment/pipeline.js";

export default async function resumeScoreRoutes(fastify: FastifyInstance) {
  /**
   * POST /score/resume
   * Score a profile from a resume upload (PDF or DOCX).
   *
   * This is the recommended primary path — zero scraping risk, user provides own data.
   *
   * Flow: Upload → extract text → Claude Sonnet parse → AI normalize → score
   */
  fastify.post("/score/resume", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "No file uploaded" },
      });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Only PDF and DOCX files are supported",
          details: { received: data.mimetype, allowed: allowedTypes },
        },
      });
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate file size (10MB max)
    if (buffer.length > 10 * 1024 * 1024) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "File must be under 10MB" },
      });
    }

    // ─── Process resume ────────────────────────────────────────────
    const { parsedProfile, resumeId, resumeHash } = await processResume(
      fastify.db,
      buffer,
      data.filename,
      data.mimetype,
    );

    // ─── Check cache by resume hash ────────────────────────────────
    const cacheKey = `score:resume:${resumeHash}`;
    const cached = await fastify.redis.get<string>(cacheKey);
    if (cached) {
      return reply.send({ data: JSON.parse(cached as string) });
    }

    // ─── Enrich + Score ────────────────────────────────────────────
    const scoreResult = await runEnrichmentPipeline(fastify.db, parsedProfile, "RESUME", {
      resumeHash,
      resumeId,
      linkedinUrl: parsedProfile.linkedinUrl
        ? `linkedin.com/in/${parsedProfile.linkedinUrl.match(/linkedin\.com\/in\/([\w-]+)/)?.[1] ?? ""}`
        : undefined,
    });

    // Cache for 24 hours
    await fastify.redis.set(cacheKey, JSON.stringify(scoreResult), { ex: 86400 });

    return reply.send({ data: scoreResult });
  });
}
