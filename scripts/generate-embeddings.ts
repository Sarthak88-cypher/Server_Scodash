import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { generateEmbeddings, vectorToSql } from "../src/services/ai/embeddings.js";

const db = new PrismaClient();

/**
 * Generate pgvector embeddings for all reference entities.
 * This enables Tier 2 (vector similarity) in the AI normalization layer.
 *
 * Run after seeding companies, institutions, and skills.
 * Cost: ~$0.10 for ~200 entities with text-embedding-3-small.
 */
async function main() {
  console.log("Generating embeddings...\n");

  // ─── Companies ───────────────────────────────────────────────────
  const companies = await db.company.findMany({ select: { id: true, name: true, aliases: true } });
  console.log(`Generating embeddings for ${companies.length} companies...`);

  const companyTexts = companies.map((c) => [c.name, ...c.aliases].join(", "));
  const companyEmbeddings = await batchEmbed(companyTexts);

  for (let i = 0; i < companies.length; i++) {
    const vec = vectorToSql(companyEmbeddings[i]);
    await db.$executeRawUnsafe(
      `UPDATE companies SET embedding = '${vec}'::vector WHERE id = '${companies[i].id}'`,
    );
  }
  console.log(`  ✓ ${companies.length} company embeddings stored\n`);

  // ─── Institutions ────────────────────────────────────────────────
  const institutions = await db.institution.findMany({ select: { id: true, name: true, aliases: true } });
  console.log(`Generating embeddings for ${institutions.length} institutions...`);

  const instTexts = institutions.map((i) => [i.name, ...i.aliases].join(", "));
  const instEmbeddings = await batchEmbed(instTexts);

  for (let i = 0; i < institutions.length; i++) {
    const vec = vectorToSql(instEmbeddings[i]);
    await db.$executeRawUnsafe(
      `UPDATE institutions SET embedding = '${vec}'::vector WHERE id = '${institutions[i].id}'`,
    );
  }
  console.log(`  ✓ ${institutions.length} institution embeddings stored\n`);

  // ─── Skills ──────────────────────────────────────────────────────
  const skills = await db.skill.findMany({ select: { id: true, name: true, aliases: true } });
  console.log(`Generating embeddings for ${skills.length} skills...`);

  const skillTexts = skills.map((s) => [s.name, ...s.aliases].join(", "));
  const skillEmbeddings = await batchEmbed(skillTexts);

  for (let i = 0; i < skills.length; i++) {
    const vec = vectorToSql(skillEmbeddings[i]);
    await db.$executeRawUnsafe(
      `UPDATE skills SET embedding = '${vec}'::vector WHERE id = '${skills[i].id}'`,
    );
  }
  console.log(`  ✓ ${skills.length} skill embeddings stored\n`);

  console.log("All embeddings generated!");
}

/**
 * Batch embed with rate limiting (max 2048 texts per call, max 8191 tokens per text).
 */
async function batchEmbed(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await generateEmbeddings(batch);
    allEmbeddings.push(...embeddings);

    if (i + BATCH_SIZE < texts.length) {
      // Brief pause between batches to respect rate limits
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return allEmbeddings;
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
