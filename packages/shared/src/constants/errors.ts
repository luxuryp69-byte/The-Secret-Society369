export const ErrorCodes = {
  UNKNOWN: "UNKNOWN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;

export type ErrorCode =
  (typeof ErrorCodes)[keyof typeof ErrorCodes];
