import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Enable pgvector extension
  await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
  console.log("pgvector extension enabled");

  // ─── Seed Industries ─────────────────────────────────────────────
  const industries = [
    { name: "SaaS / Cloud", demandScore: 9.0, growthRate: 22, trendLabel: "booming" },
    { name: "AI / Machine Learning", demandScore: 9.5, growthRate: 35, trendLabel: "booming" },
    { name: "Fintech", demandScore: 8.5, growthRate: 18, trendLabel: "growing" },
    { name: "E-Commerce", demandScore: 7.5, growthRate: 12, trendLabel: "growing" },
    { name: "EdTech", demandScore: 6.5, growthRate: 8, trendLabel: "stable" },
    { name: "HealthTech", demandScore: 7.0, growthRate: 15, trendLabel: "growing" },
    { name: "Cybersecurity", demandScore: 8.8, growthRate: 20, trendLabel: "booming" },
    { name: "Gaming", demandScore: 6.0, growthRate: 5, trendLabel: "stable" },
    { name: "IT Services", demandScore: 5.0, growthRate: 3, trendLabel: "stable" },
    { name: "Consulting", demandScore: 5.5, growthRate: 4, trendLabel: "stable" },
    { name: "Telecom", demandScore: 4.5, growthRate: 2, trendLabel: "stable" },
    { name: "Manufacturing", demandScore: 4.0, growthRate: 1, trendLabel: "stable" },
    { name: "BFSI", demandScore: 6.5, growthRate: 7, trendLabel: "growing" },
    { name: "Blockchain / Web3", demandScore: 5.5, growthRate: -5, trendLabel: "declining" },
    { name: "Media / Entertainment", demandScore: 5.0, growthRate: 3, trendLabel: "stable" },
    { name: "Logistics / Supply Chain", demandScore: 6.0, growthRate: 10, trendLabel: "growing" },
    { name: "Automotive / EV", demandScore: 7.0, growthRate: 12, trendLabel: "growing" },
    { name: "Defense / Aerospace", demandScore: 6.5, growthRate: 8, trendLabel: "growing" },
    { name: "Real Estate / PropTech", demandScore: 5.0, growthRate: 2, trendLabel: "stable" },
    { name: "AgriTech", demandScore: 5.5, growthRate: 6, trendLabel: "growing" },
  ];

  for (const industry of industries) {
    await db.industry.upsert({
      where: { name: industry.name },
      update: { demandScore: industry.demandScore, growthRate: industry.growthRate, trendLabel: industry.trendLabel },
      create: industry,
    });
  }
  console.log(`Seeded ${industries.length} industries`);

  console.log("Base seed complete!");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
