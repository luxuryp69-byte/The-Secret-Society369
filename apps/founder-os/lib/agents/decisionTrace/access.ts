import type { NextRequest } from "next/server";

const ACCESS_TOKEN_ENV = "DECISION_TRACE_ACCESS_TOKEN";

function getConfiguredToken(): string | null {
  const token = process.env[ACCESS_TOKEN_ENV]?.trim();

  return token ? token : null;
}

export type DecisionTraceAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      status: 401 | 503;
      error: string;
    };

export function authorizeDecisionTraceRequest(
  request: NextRequest,
): DecisionTraceAccessResult {
  const configuredToken = getConfiguredToken();

  if (configuredToken === null) {
    return {
      allowed: false,
      status: 503,
      error:
        "Decision trace access is not configured.",
    };
  }

  const authorization =
    request.headers.get("authorization");

  if (
    authorization === null ||
    !authorization.startsWith("Bearer ")
  ) {
    return {
      allowed: false,
      status: 401,
      error: "Decision trace authorization required.",
    };
  }

  const suppliedToken =
    authorization.slice("Bearer ".length).trim();

  if (
    !suppliedToken ||
    suppliedToken !== configuredToken
  ) {
    return {
      allowed: false,
      status: 401,
      error: "Invalid decision trace authorization.",
    };
  }

  return {
    allowed: true,
  };
}
