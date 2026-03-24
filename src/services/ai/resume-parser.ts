import { getAnthropic } from "./client.js";
import type { ParsedProfile } from "../../types/profile.js";

/**
 * Parse a resume using Claude Sonnet for structured extraction.
 * Handles PDF text or DOCX text input.
 * Returns the same ParsedProfile schema as the LinkedIn MCP path.
 */
export async function parseResumeWithAI(resumeText: string): Promise<ParsedProfile> {
  const anthropic = getAnthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Extract structured career data from this resume. Return ONLY valid JSON, no markdown fences.

Resume text:
---
${resumeText.slice(0, 15000)}
---

Return JSON matching this exact schema:
{
  "fullName": "string or null",
  "headline": "string or null (current role + company, e.g. 'Senior Engineer at Google')",
  "locationCity": "string or null",
  "locationCountry": "string or null (default 'India' if unclear)",
  "profileImageUrl": null,
  "linkedinUrl": "string or null (extract if present in resume)",
  "workExperiences": [
    {
      "companyName": "string",
      "title": "string",
      "startDate": "YYYY-MM or null",
      "endDate": "YYYY-MM or null",
      "isCurrent": boolean,
      "location": "string or null",
      "description": "string or null (brief, max 200 chars)"
    }
  ],
  "education": [
    {
      "institutionName": "string",
      "degree": "string or null (e.g. 'B.Tech', 'M.S.')",
      "fieldOfStudy": "string or null (e.g. 'Computer Science')",
      "startYear": number or null,
      "endYear": number or null
    }
  ],
  "skills": ["string array of technical and professional skills"],
  "certifications": [
    {
      "name": "string",
      "issuingOrg": "string or null",
      "issueDate": "YYYY-MM or null",
      "credentialUrl": "string or null"
    }
  ]
}

Rules:
- Work experiences sorted by date (most recent first)
- If only years are given, use "YYYY-01" for start and "YYYY-12" for end
- If "Present" or "Current", set isCurrent=true and endDate=null
- Extract ALL skills mentioned anywhere in the resume
- If location is ambiguous, leave null
- Do not fabricate data — only extract what's explicitly stated`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown fences if present (despite the instruction)
  const jsonStr = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();

  const parsed: ParsedProfile = JSON.parse(jsonStr);

  // Ensure arrays exist
  parsed.workExperiences = parsed.workExperiences ?? [];
  parsed.education = parsed.education ?? [];
  parsed.skills = parsed.skills ?? [];
  parsed.certifications = parsed.certifications ?? [];

  return parsed;
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = await import("pdf-parse") as any;
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
