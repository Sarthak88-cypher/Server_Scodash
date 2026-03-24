import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import { AppError } from "./lib/errors.js";

// Route imports
import linkedInScoreRoutes from "./routes/score/linkedin.js";
import resumeScoreRoutes from "./routes/score/resume.js";
import profileRoutes from "./routes/profile/index.js";
import compareRoutes from "./routes/compare/index.js";
import exploreRoutes from "./routes/explore/index.js";

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty", options: { colorize: true } } }
        : {}),
    },
  });

  // ─── Global plugins ──────────────────────────────────────────────
  await fastify.register(cors, {
    origin: env.NODE_ENV === "production" ? ["https://scodash.com"] : true,
    methods: ["GET", "POST"],
  });

  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_SCORE_PER_HOUR,
    timeWindow: "1 hour",
    keyGenerator: (request) => {
      return request.headers["x-forwarded-for"] as string ?? request.ip;
    },
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  // ─── Infrastructure plugins ──────────────────────────────────────
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);

  // ─── Global error handler ────────────────────────────────────────
  fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Fastify rate limit error
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Try again later." },
      });
    }

    // Prisma not found
    if (error.name === "NotFoundError" || error.code === "P2025") {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Resource not found" },
      });
    }

    // Unexpected error
    fastify.log.error(error);
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });

  // ─── Health check ────────────────────────────────────────────────
  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  }));

  // ─── Routes ──────────────────────────────────────────────────────
  await fastify.register(linkedInScoreRoutes);
  await fastify.register(resumeScoreRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(compareRoutes);
  await fastify.register(exploreRoutes);

  return fastify;
}
