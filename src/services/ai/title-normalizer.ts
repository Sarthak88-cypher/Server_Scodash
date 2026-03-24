import { getAnthropic } from "./client.js";

interface TitleNormalization {
  normalizedTitle: string;
  roleLevel: number; // 1 (intern) to 10 (C-suite)
}

/** Common title → level mappings (avoid LLM call for known titles) */
const KNOWN_TITLES: Record<string, TitleNormalization> = {
  "intern": { normalizedTitle: "Intern", roleLevel: 1 },
  "trainee": { normalizedTitle: "Trainee", roleLevel: 1 },
  "junior software engineer": { normalizedTitle: "Junior Software Engineer", roleLevel: 2 },
  "junior developer": { normalizedTitle: "Junior Software Engineer", roleLevel: 2 },
  "software engineer": { normalizedTitle: "Software Engineer", roleLevel: 3 },
  "sde": { normalizedTitle: "Software Engineer", roleLevel: 3 },
  "sde 1": { normalizedTitle: "Software Engineer I", roleLevel: 3 },
  "sde1": { normalizedTitle: "Software Engineer I", roleLevel: 3 },
  "sde i": { normalizedTitle: "Software Engineer I", roleLevel: 3 },
  "software engineer 1": { normalizedTitle: "Software Engineer I", roleLevel: 3 },
  "software engineer i": { normalizedTitle: "Software Engineer I", roleLevel: 3 },
  "sde 2": { normalizedTitle: "Software Engineer II", roleLevel: 4 },
  "sde2": { normalizedTitle: "Software Engineer II", roleLevel: 4 },
  "sde ii": { normalizedTitle: "Software Engineer II", roleLevel: 4 },
  "software engineer 2": { normalizedTitle: "Software Engineer II", roleLevel: 4 },
  "software engineer ii": { normalizedTitle: "Software Engineer II", roleLevel: 4 },
  "senior software engineer": { normalizedTitle: "Senior Software Engineer", roleLevel: 5 },
  "senior developer": { normalizedTitle: "Senior Software Engineer", roleLevel: 5 },
  "sde 3": { normalizedTitle: "Senior Software Engineer", roleLevel: 5 },
  "sde3": { normalizedTitle: "Senior Software Engineer", roleLevel: 5 },
  "staff engineer": { normalizedTitle: "Staff Engineer", roleLevel: 6 },
  "staff software engineer": { normalizedTitle: "Staff Engineer", roleLevel: 6 },
  "principal engineer": { normalizedTitle: "Principal Engineer", roleLevel: 7 },
  "principal software engineer": { normalizedTitle: "Principal Engineer", roleLevel: 7 },
  "tech lead": { normalizedTitle: "Tech Lead", roleLevel: 6 },
  "technical lead": { normalizedTitle: "Tech Lead", roleLevel: 6 },
  "engineering manager": { normalizedTitle: "Engineering Manager", roleLevel: 7 },
  "senior engineering manager": { normalizedTitle: "Senior Engineering Manager", roleLevel: 8 },
  "director of engineering": { normalizedTitle: "Director of Engineering", roleLevel: 8 },
  "vp engineering": { normalizedTitle: "VP of Engineering", roleLevel: 9 },
  "vp of engineering": { normalizedTitle: "VP of Engineering", roleLevel: 9 },
  "cto": { normalizedTitle: "CTO", roleLevel: 10 },
  "ceo": { normalizedTitle: "CEO", roleLevel: 10 },
  "product manager": { normalizedTitle: "Product Manager", roleLevel: 4 },
  "senior product manager": { normalizedTitle: "Senior Product Manager", roleLevel: 5 },
  "group product manager": { normalizedTitle: "Group Product Manager", roleLevel: 6 },
  "director of product": { normalizedTitle: "Director of Product", roleLevel: 7 },
  "vp product": { normalizedTitle: "VP of Product", roleLevel: 8 },
  "data scientist": { normalizedTitle: "Data Scientist", roleLevel: 4 },
  "senior data scientist": { normalizedTitle: "Senior Data Scientist", roleLevel: 5 },
  "ml engineer": { normalizedTitle: "ML Engineer", roleLevel: 4 },
  "senior ml engineer": { normalizedTitle: "Senior ML Engineer", roleLevel: 5 },
  "data analyst": { normalizedTitle: "Data Analyst", roleLevel: 3 },
  "senior data analyst": { normalizedTitle: "Senior Data Analyst", roleLevel: 4 },
  "devops engineer": { normalizedTitle: "DevOps Engineer", roleLevel: 4 },
  "senior devops engineer": { normalizedTitle: "Senior DevOps Engineer", roleLevel: 5 },
  "sre": { normalizedTitle: "Site Reliability Engineer", roleLevel: 4 },
  "designer": { normalizedTitle: "Designer", roleLevel: 3 },
  "senior designer": { normalizedTitle: "Senior Designer", roleLevel: 5 },
  "qa engineer": { normalizedTitle: "QA Engineer", roleLevel: 3 },
  "senior qa engineer": { normalizedTitle: "Senior QA Engineer", roleLevel: 4 },
};

/**
 * Normalize a job title to a standard form and assign a role level (1-10).
 * Uses local lookup first, then Claude Haiku for unknown titles.
 */
export async function normalizeTitle(rawTitle: string): Promise<TitleNormalization> {
  const key = rawTitle.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

  // Check known titles first
  const known = KNOWN_TITLES[key];
  if (known) return known;

  // Check partial matches (e.g., "SDE-2 at Google" → matches "sde 2")
  for (const [pattern, result] of Object.entries(KNOWN_TITLES)) {
    if (key.startsWith(pattern) || key.includes(pattern)) {
      return result;
    }
  }

  // LLM fallback for unknown titles
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Normalize this job title and assign a seniority level (1-10 scale):
1=Intern, 2=Junior, 3=Mid, 4=Mid-Senior, 5=Senior, 6=Staff/TechLead, 7=Principal/EM, 8=Director, 9=VP, 10=C-suite

Title: "${rawTitle}"

Respond in EXACTLY this format (no other text):
TITLE: <normalized title>
LEVEL: <number 1-10>`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const titleMatch = text.match(/TITLE:\s*(.+)/);
  const levelMatch = text.match(/LEVEL:\s*(\d+)/);

  return {
    normalizedTitle: titleMatch ? titleMatch[1].trim() : rawTitle,
    roleLevel: levelMatch ? Math.min(10, Math.max(1, parseInt(levelMatch[1]))) : 3,
  };
}
