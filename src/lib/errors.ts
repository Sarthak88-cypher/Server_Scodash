export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  LINKEDIN_SCRAPE_FAILED: "LINKEDIN_SCRAPE_FAILED",
  RESUME_PARSE_FAILED: "RESUME_PARSE_FAILED",
  AI_NORMALIZATION_FAILED: "AI_NORMALIZATION_FAILED",
  SCORING_FAILED: "SCORING_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export function notFound(message: string): AppError {
  return new AppError(ErrorCode.NOT_FOUND, message, 404);
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);
}

export function rateLimitError(): AppError {
  return new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, "Rate limit exceeded. Try again later.", 429);
}
