import type { PrismaClient } from "@prisma/client";
import { normalizeString } from "../../lib/utils.js";
import { generateEmbedding, vectorToSql } from "./embeddings.js";
import { getAnthropic } from "./client.js";

interface SkillMatchResult {
  id: string;
  name: string;
  demandScore: number;
  demandTrend: number;
  category: string | null;
  matchMethod: "exact" | "vector" | "llm";
  confidence: number;
}

/**
 * 3-tier skill resolution:
 * 1. Exact match on normalized_name or aliases
 * 2. pgvector cosine similarity (threshold > 0.90)
 * 3. Claude Haiku LLM classification from top-5 candidates
 */
export async function matchSkill(
  db: PrismaClient,
  rawName: string,
): Promise<SkillMatchResult | null> {
  if (!rawName.trim()) return null;

  const normalized = normalizeString(rawName);

  // ─── Tier 1: Exact match ────────────────────────────────────────────
  const exact = await db.skill.findFirst({
    where: {
      OR: [
        { normalizedName: normalized },
        { aliases: { has: normalized } },
        { aliases: { has: rawName.trim().toLowerCase() } },
      ],
    },
  });

  if (exact) {
    return {
      id: exact.id,
      name: exact.name,
      demandScore: exact.demandScore,
      demandTrend: exact.demandTrend,
      category: exact.category,
      matchMethod: "exact",
      confidence: 1.0,
    };
  }

  // ─── Tier 2: Vector similarity ──────────────────────────────────────
  const embedding = await generateEmbedding(rawName);
  const vectorStr = vectorToSql(embedding);

  const vectorResults: Array<{
    id: string;
    name: string;
    demand_score: number;
    demand_trend: number;
    category: string | null;
    similarity: number;
  }> = await db.$queryRawUnsafe(`
    SELECT id, name, demand_score, demand_trend, category,
           1 - (embedding <=> '${vectorStr}'::vector) as similarity
    FROM skills
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> '${vectorStr}'::vector
    LIMIT 5
  `);

  // Skills use a slightly lower threshold (0.90) because skill names can be short
  if (vectorResults.length > 0 && vectorResults[0].similarity > 0.90) {
    const best = vectorResults[0];
    return {
      id: best.id,
      name: best.name,
      demandScore: best.demand_score,
      demandTrend: best.demand_trend,
      category: best.category,
      matchMethod: "vector",
      confidence: best.similarity,
    };
  }

  // ─── Tier 3: LLM resolution ────────────────────────────────────────
  if (vectorResults.length > 0) {
    const candidates = vectorResults.map(
      (r) => `- "${r.name}" (category: ${r.category ?? "unknown"}, similarity: ${r.similarity.toFixed(3)})`,
    );

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `I need to match the skill "${rawName}" to one of these database entries:

${candidates.join("\n")}

If one of these is clearly the same skill (just a different name/abbreviation, e.g. "k8s" = "Kubernetes"), respond with ONLY the exact name from the list.
If none match, respond with ONLY the word "NONE".
Do not explain.`,
        },
      ],
    });

    const llmAnswer = (response.content[0].type === "text" ? response.content[0].text : "").trim();

    if (llmAnswer !== "NONE") {
      const matched = vectorResults.find(
        (r) => r.name.toLowerCase() === llmAnswer.toLowerCase(),
      );
      if (matched) {
        await db.skill.update({
          where: { id: matched.id },
          data: { aliases: { push: rawName.trim().toLowerCase() } },
        });

        return {
          id: matched.id,
          name: matched.name,
          demandScore: matched.demand_score,
          demandTrend: matched.demand_trend,
          category: matched.category,
          matchMethod: "llm",
          confidence: 0.85,
        };
      }
    }
  }

  return null;
}

/**
 * Match multiple skills in batch (with individual fallbacks).
 */
export async function matchSkills(
  db: PrismaClient,
  rawNames: string[],
): Promise<Array<SkillMatchResult | null>> {
  return Promise.all(rawNames.map((name) => matchSkill(db, name)));
}
