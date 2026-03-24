import { PrismaClient, InstitutionTier } from "@prisma/client";

const db = new PrismaClient();

interface InstitutionSeed {
  name: string;
  normalizedName: string;
  aliases: string[];
  tier: InstitutionTier;
  tierScore: number;
  country: string;
  type: string;
  nirfRank?: number;
}

const INSTITUTIONS: InstitutionSeed[] = [
  // ─── S Tier ──────────────────────────────────────────────────────
  { name: "IIT Bombay", normalizedName: "iit bombay", aliases: ["iitb", "iit-b", "indian institute of technology bombay"], tier: "S", tierScore: 1.0, country: "India", type: "IIT", nirfRank: 3 },
  { name: "IIT Delhi", normalizedName: "iit delhi", aliases: ["iitd", "iit-d", "indian institute of technology delhi"], tier: "S", tierScore: 1.0, country: "India", type: "IIT", nirfRank: 2 },
  { name: "IIT Madras", normalizedName: "iit madras", aliases: ["iitm", "iit-m", "indian institute of technology madras"], tier: "S", tierScore: 1.0, country: "India", type: "IIT", nirfRank: 1 },
  { name: "IIT Kanpur", normalizedName: "iit kanpur", aliases: ["iitk", "iit-k", "indian institute of technology kanpur"], tier: "S", tierScore: 0.98, country: "India", type: "IIT", nirfRank: 4 },
  { name: "IIT Kharagpur", normalizedName: "iit kharagpur", aliases: ["iitkgp", "iit-kgp", "indian institute of technology kharagpur"], tier: "S", tierScore: 0.97, country: "India", type: "IIT", nirfRank: 5 },
  { name: "IISc Bangalore", normalizedName: "iisc bangalore", aliases: ["iisc", "indian institute of science", "indian institute of science bangalore"], tier: "S", tierScore: 1.0, country: "India", type: "Research", nirfRank: 1 },
  { name: "MIT", normalizedName: "mit", aliases: ["massachusetts institute of technology"], tier: "S", tierScore: 1.0, country: "USA", type: "Foreign" },
  { name: "Stanford University", normalizedName: "stanford university", aliases: ["stanford", "stanford univ"], tier: "S", tierScore: 1.0, country: "USA", type: "Foreign" },
  { name: "Carnegie Mellon University", normalizedName: "carnegie mellon university", aliases: ["cmu", "carnegie mellon"], tier: "S", tierScore: 0.98, country: "USA", type: "Foreign" },

  // ─── A Tier ──────────────────────────────────────────────────────
  { name: "IIT Roorkee", normalizedName: "iit roorkee", aliases: ["iitr", "iit-r", "indian institute of technology roorkee"], tier: "A", tierScore: 0.90, country: "India", type: "IIT", nirfRank: 6 },
  { name: "IIT Guwahati", normalizedName: "iit guwahati", aliases: ["iitg", "iit-g", "indian institute of technology guwahati"], tier: "A", tierScore: 0.88, country: "India", type: "IIT", nirfRank: 7 },
  { name: "IIT Hyderabad", normalizedName: "iit hyderabad", aliases: ["iith", "iit-h", "indian institute of technology hyderabad"], tier: "A", tierScore: 0.86, country: "India", type: "IIT", nirfRank: 8 },
  { name: "NIT Trichy", normalizedName: "nit trichy", aliases: ["nitt", "nit tiruchirappalli", "national institute of technology tiruchirappalli"], tier: "A", tierScore: 0.85, country: "India", type: "NIT", nirfRank: 9 },
  { name: "NIT Warangal", normalizedName: "nit warangal", aliases: ["nitw", "national institute of technology warangal"], tier: "A", tierScore: 0.83, country: "India", type: "NIT" },
  { name: "NIT Surathkal", normalizedName: "nit surathkal", aliases: ["nitk", "nit karnataka", "national institute of technology karnataka"], tier: "A", tierScore: 0.83, country: "India", type: "NIT" },
  { name: "BITS Pilani", normalizedName: "bits pilani", aliases: ["bits", "birla institute of technology and science", "bits pilani goa", "bits hyderabad"], tier: "A", tierScore: 0.88, country: "India", type: "Private" },
  { name: "IIIT Hyderabad", normalizedName: "iiit hyderabad", aliases: ["iiith", "iiit-h", "international institute of information technology hyderabad"], tier: "A", tierScore: 0.86, country: "India", type: "IIIT" },
  { name: "DTU", normalizedName: "dtu", aliases: ["delhi technological university", "dce", "delhi college of engineering"], tier: "A", tierScore: 0.82, country: "India", type: "State" },
  { name: "NSUT", normalizedName: "nsut", aliases: ["netaji subhas university of technology", "nsit", "netaji subhas institute of technology"], tier: "A", tierScore: 0.80, country: "India", type: "State" },

  // ─── B Tier ──────────────────────────────────────────────────────
  { name: "VIT Vellore", normalizedName: "vit vellore", aliases: ["vit", "vellore institute of technology"], tier: "B", tierScore: 0.72, country: "India", type: "Private" },
  { name: "SRM University", normalizedName: "srm university", aliases: ["srm", "srm institute of science and technology", "srmist"], tier: "B", tierScore: 0.68, country: "India", type: "Private" },
  { name: "Manipal Institute of Technology", normalizedName: "manipal institute of technology", aliases: ["mit manipal", "manipal university"], tier: "B", tierScore: 0.72, country: "India", type: "Private" },
  { name: "PES University", normalizedName: "pes university", aliases: ["pes", "pesu", "pes institute of technology"], tier: "B", tierScore: 0.70, country: "India", type: "Private" },
  { name: "Thapar University", normalizedName: "thapar university", aliases: ["thapar", "thapar institute of engineering"], tier: "B", tierScore: 0.70, country: "India", type: "Private" },
  { name: "IIIT Bangalore", normalizedName: "iiit bangalore", aliases: ["iiitb", "iiit-b", "international institute of information technology bangalore"], tier: "B", tierScore: 0.78, country: "India", type: "IIIT" },
  { name: "IIIT Delhi", normalizedName: "iiit delhi", aliases: ["iiitd", "iiit-d", "indraprastha institute of information technology delhi"], tier: "B", tierScore: 0.78, country: "India", type: "IIIT" },
  { name: "College of Engineering Pune", normalizedName: "college of engineering pune", aliases: ["coep", "coep technological university"], tier: "B", tierScore: 0.72, country: "India", type: "State" },
  { name: "Jadavpur University", normalizedName: "jadavpur university", aliases: ["ju", "jadavpur"], tier: "B", tierScore: 0.74, country: "India", type: "State" },

  // ─── C Tier ──────────────────────────────────────────────────────
  { name: "Amity University", normalizedName: "amity university", aliases: ["amity", "amity noida"], tier: "C", tierScore: 0.55, country: "India", type: "Private" },
  { name: "Lovely Professional University", normalizedName: "lovely professional university", aliases: ["lpu"], tier: "C", tierScore: 0.50, country: "India", type: "Private" },
  { name: "Chandigarh University", normalizedName: "chandigarh university", aliases: ["cu", "chandigarh uni"], tier: "C", tierScore: 0.52, country: "India", type: "Private" },
  { name: "Chitkara University", normalizedName: "chitkara university", aliases: ["chitkara"], tier: "C", tierScore: 0.52, country: "India", type: "Private" },
];

async function main() {
  console.log("Seeding institutions...");

  for (const inst of INSTITUTIONS) {
    await db.institution.upsert({
      where: { normalizedName: inst.normalizedName },
      update: {
        name: inst.name,
        aliases: inst.aliases,
        tier: inst.tier,
        tierScore: inst.tierScore,
        nirfRank: inst.nirfRank,
        type: inst.type,
      },
      create: inst,
    });
  }

  console.log(`Seeded ${INSTITUTIONS.length} institutions`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
