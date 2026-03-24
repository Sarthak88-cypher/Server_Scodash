import type { PrismaClient } from "@prisma/client";
import { normalizeString } from "../../lib/utils.js";
import { generateEmbedding, vectorToSql } from "./embeddings.js";
import { getAnthropic } from "./client.js";

interface InstitutionMatchResult {
  id: string;
  name: string;
  tier: string;
  tierScore: number;
  matchMethod: "exact" | "vector" | "llm" | "new";
  confidence: number;
}

/**
 * 3-tier institution resolution:
 * 1. Exact match on normalized_name or aliases
 * 2. pgvector cosine similarity (threshold > 0.92)
 * 3. Claude Haiku LLM classification from top-5 candidates
 */
export async function matchInstitution(
  db: PrismaClient,
  rawName: string,
): Promise<InstitutionMatchResult | null> {
  if (!rawName.trim()) return null;

  const normalized = normalizeString(rawName);

  // ─── Tier 1: Exact match ────────────────────────────────────────────
  const exact = await db.institution.findFirst({
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
      tier: exact.tier,
      tierScore: exact.tierScore,
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
    tier: string;
    tier_score: number;
    similarity: number;
  }> = await db.$queryRawUnsafe(`
    SELECT id, name, tier, tier_score,
           1 - (embedding <=> '${vectorStr}'::vector) as similarity
    FROM institutions
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> '${vectorStr}'::vector
    LIMIT 5
  `);

  if (vectorResults.length > 0 && vectorResults[0].similarity > 0.92) {
    const best = vectorResults[0];
    return {
      id: best.id,
      name: best.name,
      tier: best.tier,
      tierScore: best.tier_score,
      matchMethod: "vector",
      confidence: best.similarity,
    };
  }

  // ─── Tier 3: LLM resolution ────────────────────────────────────────
  if (vectorResults.length > 0) {
    const candidates = vectorResults.map(
      (r) => `- "${r.name}" (tier: ${r.tier}, similarity: ${r.similarity.toFixed(3)})`,
    );

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `I need to match the institution name "${rawName}" to one of these database entries:

${candidates.join("\n")}

If one of these is clearly the same institution (just a different name/abbreviation), respond with ONLY the exact name from the list.
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
        await db.institution.update({
          where: { id: matched.id },
          data: { aliases: { push: rawName.trim().toLowerCase() } },
        });

        return {
          id: matched.id,
          name: matched.name,
          tier: matched.tier,
          tierScore: matched.tier_score,
          matchMethod: "llm",
          confidence: 0.85,
        };
      }
    }
  }

  return null;
}
