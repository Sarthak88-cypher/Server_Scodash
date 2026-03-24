import type { ParsedProfile } from "../../types/profile.js";

/**
 * Fetch a LinkedIn profile via the LinkedIn MCP tool.
 *
 * In the Scodash architecture, the LinkedIn MCP is called from the
 * Claude Code environment. This function is the adapter that accepts
 * MCP output and transforms it to our ParsedProfile schema.
 *
 * For Phase 1: This will be called as an MCP tool invocation from the
 * scoring API route. The actual MCP call is handled by the Claude environment.
 *
 * This function handles the raw MCP response → ParsedProfile transformation.
 */
export function transformLinkedInProfile(mcpResponse: LinkedInMCPResponse): ParsedProfile {
  return {
    fullName: mcpResponse.full_name ?? null,
    headline: mcpResponse.headline ?? null,
    locationCity: mcpResponse.city ?? null,
    locationCountry: mcpResponse.country ?? "India",
    profileImageUrl: mcpResponse.profile_pic_url ?? null,
    linkedinUrl: mcpResponse.public_identifier
      ? `linkedin.com/in/${mcpResponse.public_identifier}`
      : null,

    workExperiences: (mcpResponse.experiences ?? []).map((exp) => ({
      companyName: exp.company ?? "Unknown",
      title: exp.title ?? "Unknown",
      startDate: formatMCPDate(exp.starts_at),
      endDate: exp.ends_at ? formatMCPDate(exp.ends_at) : null,
      isCurrent: !exp.ends_at,
      location: exp.location ?? null,
      description: exp.description?.slice(0, 500) ?? null,
    })),

    education: (mcpResponse.education ?? []).map((edu) => ({
      institutionName: edu.school ?? "Unknown",
      degree: edu.degree_name ?? null,
      fieldOfStudy: edu.field_of_study ?? null,
      startYear: edu.starts_at?.year ?? null,
      endYear: edu.ends_at?.year ?? null,
    })),

    skills: mcpResponse.skills?.map((s) => (typeof s === "string" ? s : s.name)) ?? [],

    certifications: (mcpResponse.certifications ?? []).map((cert) => ({
      name: cert.name ?? "Unknown",
      issuingOrg: cert.authority ?? null,
      issueDate: formatMCPDate(cert.starts_at),
      credentialUrl: cert.url ?? null,
    })),
  };
}

function formatMCPDate(dateObj: MCPDate | null | undefined): string | null {
  if (!dateObj) return null;
  const year = dateObj.year;
  const month = dateObj.month ? String(dateObj.month).padStart(2, "0") : "01";
  return year ? `${year}-${month}` : null;
}

// ─── LinkedIn MCP Response Types ──────────────────────────────────

interface MCPDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface LinkedInMCPResponse {
  public_identifier?: string;
  full_name?: string;
  headline?: string;
  city?: string;
  state?: string;
  country?: string;
  country_full_name?: string;
  profile_pic_url?: string;
  summary?: string;

  experiences?: Array<{
    company?: string;
    company_linkedin_profile_url?: string;
    title?: string;
    starts_at?: MCPDate;
    ends_at?: MCPDate;
    location?: string;
    description?: string;
  }>;

  education?: Array<{
    school?: string;
    school_linkedin_profile_url?: string;
    degree_name?: string;
    field_of_study?: string;
    starts_at?: MCPDate;
    ends_at?: MCPDate;
    description?: string;
  }>;

  skills?: Array<string | { name: string }>;

  certifications?: Array<{
    name?: string;
    authority?: string;
    starts_at?: MCPDate;
    ends_at?: MCPDate;
    url?: string;
  }>;
}
