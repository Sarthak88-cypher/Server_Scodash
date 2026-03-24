import { z } from "zod";

/** POST /score/linkedin */
export const scoreLinkedInSchema = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .regex(/linkedin\.com\/in\/[\w-]+/, "Must be a LinkedIn profile URL"),
});
export type ScoreLinkedInInput = z.infer<typeof scoreLinkedInSchema>;

/** POST /score/resume — multipart file upload, validated in route */
export const scoreResumeMetaSchema = z.object({
  fileName: z.string(),
  fileType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  fileSizeBytes: z.number().max(10 * 1024 * 1024, "File must be under 10MB"),
});

/** GET /profile/:id */
export const profileParamsSchema = z.object({
  id: z.string().uuid("Invalid profile ID"),
});

/** GET /compare?ids=uuid1,uuid2 */
export const compareQuerySchema = z.object({
  ids: z
    .string()
    .transform((s) => s.split(",").map((id) => id.trim()))
    .pipe(z.array(z.string().uuid()).length(2, "Exactly 2 profile IDs required")),
});

/** GET /explore */
export const exploreQuerySchema = z.object({
  role: z.string().optional(),
  yoeMin: z.coerce.number().int().min(0).optional(),
  yoeMax: z.coerce.number().int().max(50).optional(),
  location: z.string().optional(),
  minScore: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(["score", "recent"]).default("score"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ExploreInput = z.infer<typeof exploreQuerySchema>;

/** Standard API response envelope */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
