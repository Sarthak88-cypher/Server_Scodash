import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient({
    log: fastify.log.level === "debug" ? ["query", "info", "warn", "error"] : ["error"],
  });

  await prisma.$connect();
  fastify.log.info("Database connected");

  fastify.decorate("db", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
    fastify.log.info("Database disconnected");
  });
});
