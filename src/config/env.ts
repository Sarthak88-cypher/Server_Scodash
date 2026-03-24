import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),

  // Server
  PORT: z.coerce.number().default(8001),
  HOST: z.string().default("localhost"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Rate Limiting
  RATE_LIMIT_SCORE_PER_HOUR: z.coerce.number().default(10),
  RATE_LIMIT_EXPLORE_PER_MINUTE: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
