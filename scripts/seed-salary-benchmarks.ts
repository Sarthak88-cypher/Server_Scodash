import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Seed salary benchmarks from aggregated Kaggle data.
 * This represents the static salary table for Phase 1.
 *
 * Sources: AmbitionBox, Glassdoor India, LinkedIn Jobs, Software Professional Salaries
 * All values in LPA (Lakhs Per Annum, INR).
 */

interface SalaryBenchmarkSeed {
  roleCategory: string;
  yoeBand: string;
  location: string;
  source: string;
  minCtc: number;
  maxCtc: number;
  medianCtc: number;
  sampleSize: number;
}

const BENCHMARKS: SalaryBenchmarkSeed[] = [
  // ─── Software Engineer ────────────────────────────────────────────
  { roleCategory: "Software Engineer", yoeBand: "0-2", location: "Bangalore", source: "kaggle_aggregate", minCtc: 4, maxCtc: 15, medianCtc: 8, sampleSize: 5000 },
  { roleCategory: "Software Engineer", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 3, maxCtc: 12, medianCtc: 6, sampleSize: 12000 },
  { roleCategory: "Software Engineer", yoeBand: "3-5", location: "Bangalore", source: "kaggle_aggregate", minCtc: 10, maxCtc: 35, medianCtc: 18, sampleSize: 4500 },
  { roleCategory: "Software Engineer", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 8, maxCtc: 30, medianCtc: 15, sampleSize: 10000 },
  { roleCategory: "Software Engineer", yoeBand: "6-8", location: "Bangalore", source: "kaggle_aggregate", minCtc: 20, maxCtc: 55, medianCtc: 32, sampleSize: 3000 },
  { roleCategory: "Software Engineer", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 15, maxCtc: 50, medianCtc: 28, sampleSize: 7000 },
  { roleCategory: "Software Engineer", yoeBand: "9-12", location: "Bangalore", source: "kaggle_aggregate", minCtc: 30, maxCtc: 80, medianCtc: 48, sampleSize: 2000 },
  { roleCategory: "Software Engineer", yoeBand: "9-12", location: "India", source: "kaggle_aggregate", minCtc: 25, maxCtc: 70, medianCtc: 40, sampleSize: 5000 },
  { roleCategory: "Software Engineer", yoeBand: "13+", location: "India", source: "kaggle_aggregate", minCtc: 40, maxCtc: 120, medianCtc: 60, sampleSize: 3000 },

  // ─── Backend Engineer ────────────────────────────────────────────
  { roleCategory: "Backend Engineer", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 4, maxCtc: 15, medianCtc: 8, sampleSize: 3000 },
  { roleCategory: "Backend Engineer", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 10, maxCtc: 35, medianCtc: 18, sampleSize: 2800 },
  { roleCategory: "Backend Engineer", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 20, maxCtc: 55, medianCtc: 32, sampleSize: 2000 },
  { roleCategory: "Backend Engineer", yoeBand: "9-12", location: "India", source: "kaggle_aggregate", minCtc: 30, maxCtc: 80, medianCtc: 48, sampleSize: 1500 },

  // ─── Frontend Engineer ───────────────────────────────────────────
  { roleCategory: "Frontend Engineer", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 3.5, maxCtc: 12, medianCtc: 7, sampleSize: 2000 },
  { roleCategory: "Frontend Engineer", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 8, maxCtc: 30, medianCtc: 15, sampleSize: 1800 },
  { roleCategory: "Frontend Engineer", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 18, maxCtc: 50, medianCtc: 28, sampleSize: 1200 },

  // ─── Data Scientist ──────────────────────────────────────────────
  { roleCategory: "Data Scientist", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 5, maxCtc: 18, medianCtc: 10, sampleSize: 2000 },
  { roleCategory: "Data Scientist", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 12, maxCtc: 40, medianCtc: 22, sampleSize: 1800 },
  { roleCategory: "Data Scientist", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 25, maxCtc: 65, medianCtc: 38, sampleSize: 1200 },
  { roleCategory: "Data Scientist", yoeBand: "9-12", location: "India", source: "kaggle_aggregate", minCtc: 35, maxCtc: 90, medianCtc: 55, sampleSize: 800 },

  // ─── Product Manager ─────────────────────────────────────────────
  { roleCategory: "Product Manager", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 6, maxCtc: 18, medianCtc: 12, sampleSize: 1500 },
  { roleCategory: "Product Manager", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 15, maxCtc: 40, medianCtc: 25, sampleSize: 1200 },
  { roleCategory: "Product Manager", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 25, maxCtc: 60, medianCtc: 38, sampleSize: 800 },
  { roleCategory: "Product Manager", yoeBand: "9-12", location: "India", source: "kaggle_aggregate", minCtc: 40, maxCtc: 90, medianCtc: 55, sampleSize: 500 },

  // ─── DevOps / SRE ────────────────────────────────────────────────
  { roleCategory: "DevOps Engineer", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 4, maxCtc: 14, medianCtc: 8, sampleSize: 1500 },
  { roleCategory: "DevOps Engineer", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 10, maxCtc: 35, medianCtc: 20, sampleSize: 1200 },
  { roleCategory: "DevOps Engineer", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 22, maxCtc: 55, medianCtc: 35, sampleSize: 800 },

  // ─── Engineering Manager ─────────────────────────────────────────
  { roleCategory: "Engineering Manager", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 30, maxCtc: 70, medianCtc: 45, sampleSize: 800 },
  { roleCategory: "Engineering Manager", yoeBand: "9-12", location: "India", source: "kaggle_aggregate", minCtc: 45, maxCtc: 100, medianCtc: 65, sampleSize: 600 },
  { roleCategory: "Engineering Manager", yoeBand: "13+", location: "India", source: "kaggle_aggregate", minCtc: 60, maxCtc: 150, medianCtc: 90, sampleSize: 400 },

  // ─── QA Engineer ─────────────────────────────────────────────────
  { roleCategory: "QA Engineer", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 3, maxCtc: 10, medianCtc: 5.5, sampleSize: 2000 },
  { roleCategory: "QA Engineer", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 7, maxCtc: 22, medianCtc: 12, sampleSize: 1500 },
  { roleCategory: "QA Engineer", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 14, maxCtc: 35, medianCtc: 22, sampleSize: 1000 },

  // ─── Data Engineer ───────────────────────────────────────────────
  { roleCategory: "Data Engineer", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 5, maxCtc: 15, medianCtc: 9, sampleSize: 1500 },
  { roleCategory: "Data Engineer", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 12, maxCtc: 38, medianCtc: 20, sampleSize: 1200 },
  { roleCategory: "Data Engineer", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 22, maxCtc: 55, medianCtc: 35, sampleSize: 800 },

  // ─── Mobile Engineer ─────────────────────────────────────────────
  { roleCategory: "Mobile Engineer", yoeBand: "0-2", location: "India", source: "kaggle_aggregate", minCtc: 4, maxCtc: 14, medianCtc: 7.5, sampleSize: 1500 },
  { roleCategory: "Mobile Engineer", yoeBand: "3-5", location: "India", source: "kaggle_aggregate", minCtc: 10, maxCtc: 32, medianCtc: 18, sampleSize: 1200 },
  { roleCategory: "Mobile Engineer", yoeBand: "6-8", location: "India", source: "kaggle_aggregate", minCtc: 20, maxCtc: 50, medianCtc: 30, sampleSize: 800 },
];

async function main() {
  console.log("Seeding salary benchmarks...");

  // Clear existing benchmarks (they'll be refreshed quarterly)
  await db.salaryBenchmark.deleteMany({});

  const now = new Date();
  for (const benchmark of BENCHMARKS) {
    await db.salaryBenchmark.create({
      data: {
        ...benchmark,
        fetchedAt: now,
      },
    });
  }

  console.log(`Seeded ${BENCHMARKS.length} salary benchmarks`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
