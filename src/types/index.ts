export type { SignalResult, ScoreResult, SignalBreakdown, CompareResult } from "./scoring.js";
export { SIGNAL_WEIGHTS, COMPANY_TIER_SCORES, INSTITUTION_TIER_SCORES } from "./scoring.js";

export type {
  ParsedProfile,
  ParsedWorkExperience,
  ParsedEducation,
  ParsedCertification,
  ProfileWithRelations,
} from "./profile.js";

export {
  scoreLinkedInSchema,
  scoreResumeMetaSchema,
  profileParamsSchema,
  compareQuerySchema,
  exploreQuerySchema,
} from "./api.js";
export type { ScoreLinkedInInput, ExploreInput, ApiResponse, ApiErrorResponse } from "./api.js";
