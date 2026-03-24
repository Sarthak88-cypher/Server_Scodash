/** Individual signal calculation result */
export interface SignalResult {
  signalType: string;
  rawValue: number;
  normalizedValue: number; // 0-100
  details: Record<string, unknown>;
}

/** Full scoring result returned to clients */
export interface ScoreResult {
  profileId: string;
  finalScore: number; // 0-10,000
  percentile: number | null;
  rankInSegment: number | null;
  segment: {
    roleCategory: string;
    yoeBand: string;
    geography: string;
  } | null;
  confidence: number;
  signals: SignalBreakdown[];
  profile: {
    fullName: string | null;
    headline: string | null;
    locationCity: string | null;
    locationCountry: string | null;
    profileImageUrl: string | null;
  };
  scoredAt: string;
}

/** Signal breakdown for display */
export interface SignalBreakdown {
  name: string;
  signalType: string;
  value: number; // weighted contribution to final score
  maxValue: number; // max possible contribution
  normalizedScore: number; // 0-100
  weight: number; // 0-1
  details: Record<string, unknown>;
}

/** Comparison between two profiles */
export interface CompareResult {
  profiles: [ScoreResult, ScoreResult];
  deltas: {
    finalScore: number;
    signals: Array<{
      name: string;
      signalType: string;
      delta: number;
    }>;
  };
}

/** Signal weight configuration */
export const SIGNAL_WEIGHTS: Record<string, number> = {
  company_tier: 0.15,
  role_progression: 0.18,
  education: 0.10,
  skills_demand: 0.17,
  trajectory_momentum: 0.20,
  ctc_market_ratio: 0.10,
  stability: 0.05,
  industry_demand: 0.05,
};

/** Company tier score mapping */
export const COMPANY_TIER_SCORES: Record<string, number> = {
  S: 95,
  A: 80,
  B: 65,
  C: 50,
  D: 35,
};

/** Institution tier score mapping */
export const INSTITUTION_TIER_SCORES: Record<string, number> = {
  S: 95,
  A: 80,
  B: 65,
  C: 45,
};
