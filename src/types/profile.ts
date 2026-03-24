/** Structured profile data — common schema for both LinkedIn and resume sources */
export interface ParsedProfile {
  fullName: string | null;
  headline: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  profileImageUrl: string | null;
  linkedinUrl: string | null;

  workExperiences: ParsedWorkExperience[];
  education: ParsedEducation[];
  skills: string[];
  certifications: ParsedCertification[];
}

export interface ParsedWorkExperience {
  companyName: string;
  title: string;
  startDate: string | null; // ISO date string or "YYYY-MM"
  endDate: string | null;
  isCurrent: boolean;
  location: string | null;
  description: string | null;
}

export interface ParsedEducation {
  institutionName: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
}

export interface ParsedCertification {
  name: string;
  issuingOrg: string | null;
  issueDate: string | null;
  credentialUrl: string | null;
}

/** Profile with all relations loaded (for scoring) */
export interface ProfileWithRelations {
  id: string;
  linkedinUrl: string | null;
  status: string;
  confidence: number;
  fullName: string | null;
  headline: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  finalScore: number;
  segmentId: string | null;

  workExperiences: Array<{
    id: string;
    companyName: string;
    title: string;
    normalizedTitle: string | null;
    roleLevel: number | null;
    startDate: Date | null;
    endDate: Date | null;
    isCurrent: boolean;
    location: string | null;
    company: {
      id: string;
      name: string;
      tier: string;
      tierScore: number;
      industry: string | null;
    } | null;
  }>;

  education: Array<{
    id: string;
    institutionName: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startYear: number | null;
    endYear: number | null;
    institution: {
      id: string;
      name: string;
      tier: string;
      tierScore: number;
    } | null;
  }>;

  skills: Array<{
    id: string;
    endorsementCount: number;
    skill: {
      id: string;
      name: string;
      demandScore: number;
      demandTrend: number;
      category: string | null;
    };
  }>;

  ctcEstimates: Array<{
    source: string;
    estimatedCtc: number | null;
    marketMedian: number | null;
    marketRatio: number | null;
  }>;
}
