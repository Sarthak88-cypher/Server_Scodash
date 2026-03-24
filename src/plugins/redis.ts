import fp from "fastify-plugin";
import { Redis } from "@upstash/redis";
import { env } from "../config/env.js";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  fastify.decorate("redis", redis);
  fastify.log.info("Redis connected");
});
