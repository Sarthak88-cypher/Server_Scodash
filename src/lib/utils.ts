/**
 * Normalize a LinkedIn URL to a canonical form.
 * "https://www.linkedin.com/in/john-doe/" → "linkedin.com/in/john-doe"
 */
export function normalizeLinkedInUrl(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([\w-]+)/i);
  if (!match) throw new Error(`Invalid LinkedIn URL: ${url}`);
  return `linkedin.com/in/${match[1].toLowerCase()}`;
}

/**
 * Calculate years of experience from work history dates.
 */
export function calculateYOE(
  workExperiences: Array<{ startDate: Date | null; endDate: Date | null; isCurrent: boolean }>,
): number {
  if (workExperiences.length === 0) return 0;

  const sorted = [...workExperiences]
    .filter((w) => w.startDate)
    .sort((a, b) => (a.startDate!.getTime() - b.startDate!.getTime()));

  if (sorted.length === 0) return 0;

  const earliest = sorted[0].startDate!;
  const latest = sorted.find((w) => w.isCurrent)
    ? new Date()
    : sorted.reduce((max, w) => {
        const end = w.endDate ?? w.startDate!;
        return end > max ? end : max;
      }, sorted[0].startDate!);

  return Math.max(0, (latest.getTime() - earliest.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Map YOE to a band string for segment matching.
 */
export function yoeToBand(yoe: number): string {
  if (yoe < 2) return "0-2";
  if (yoe < 5) return "3-5";
  if (yoe < 8) return "6-8";
  if (yoe < 12) return "9-12";
  return "13+";
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize a string for fuzzy matching: lowercase, trim, remove special chars.
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Create a SHA-256 hash of a string (for resume deduplication).
 */
export async function sha256(data: string | Buffer): Promise<string> {
  const crypto = await import("node:crypto");
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Format a signal type key to a human-readable name.
 * "company_tier" → "Company Tier"
 */
export function formatSignalName(signalType: string): string {
  return signalType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Guess role category from work experiences for segment assignment.
 */
export function guessRoleCategory(
  workExperiences: Array<{ title: string; normalizedTitle?: string | null }>,
): string {
  const current = workExperiences.find((w) => w.normalizedTitle) ?? workExperiences[0];
  if (!current) return "General";

  const title = (current.normalizedTitle ?? current.title).toLowerCase();

  const roleMap: Record<string, string[]> = {
    "Backend Engineer": ["backend", "server", "api", "node", "java developer", "python developer", "golang"],
    "Frontend Engineer": ["frontend", "front-end", "react", "angular", "vue", "ui developer"],
    "Full Stack Engineer": ["full stack", "fullstack", "full-stack"],
    "Mobile Engineer": ["mobile", "ios", "android", "flutter", "react native"],
    "DevOps Engineer": ["devops", "sre", "infrastructure", "platform engineer", "cloud engineer"],
    "Data Scientist": ["data scientist", "machine learning", "ml engineer", "ai engineer", "deep learning"],
    "Data Engineer": ["data engineer", "etl", "data pipeline", "analytics engineer"],
    "Product Manager": ["product manager", "product owner", "pm"],
    "Engineering Manager": ["engineering manager", "em", "tech lead", "technical lead", "vp engineering"],
    "Designer": ["designer", "ux", "ui/ux", "product designer"],
    "QA Engineer": ["qa", "quality", "test engineer", "sdet"],
  };

  for (const [category, keywords] of Object.entries(roleMap)) {
    if (keywords.some((kw) => title.includes(kw))) return category;
  }

  if (title.includes("engineer") || title.includes("developer") || title.includes("sde")) {
    return "Software Engineer";
  }

  return "General";
}
