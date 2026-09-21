import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  authorizeDecisionTraceRequest,
} from "@/lib/agents/decisionTrace/access";

describe("Decision Trace access control", () => {
  const originalToken =
    process.env.DECISION_TRACE_ACCESS_TOKEN;

  beforeEach(() => {
    delete process.env.DECISION_TRACE_ACCESS_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.DECISION_TRACE_ACCESS_TOKEN;
    } else {
      process.env.DECISION_TRACE_ACCESS_TOKEN =
        originalToken;
    }
  });

  function request(
    authorization?: string,
  ): NextRequest {
    return new NextRequest(
      "http://localhost/api/chat/trace",
      {
        headers: authorization
          ? {
              authorization,
            }
          : undefined,
      },
    );
  }

  it("fails closed when the access token is not configured", () => {
    const result =
      authorizeDecisionTraceRequest(
        request(),
      );

    expect(result).toEqual({
      allowed: false,
      status: 503,
      error:
        "Decision trace access is not configured.",
    });
  });

  it("rejects a request without authorization", () => {
    process.env.DECISION_TRACE_ACCESS_TOKEN =
      "test-secret";

    const result =
      authorizeDecisionTraceRequest(
        request(),
      );

    expect(result).toEqual({
      allowed: false,
      status: 401,
      error:
        "Decision trace authorization required.",
    });
  });

  it("rejects an invalid authorization scheme", () => {
    process.env.DECISION_TRACE_ACCESS_TOKEN =
      "test-secret";

    const result =
      authorizeDecisionTraceRequest(
        request("Basic test-secret"),
      );

    expect(result).toEqual({
      allowed: false,
      status: 401,
      error:
        "Decision trace authorization required.",
    });
  });

  it("rejects an incorrect bearer token", () => {
    process.env.DECISION_TRACE_ACCESS_TOKEN =
      "test-secret";

    const result =
      authorizeDecisionTraceRequest(
        request("Bearer wrong-secret"),
      );

    expect(result).toEqual({
      allowed: false,
      status: 401,
      error:
        "Invalid decision trace authorization.",
    });
  });

  it("rejects an empty bearer token", () => {
    process.env.DECISION_TRACE_ACCESS_TOKEN =
      "test-secret";

    const result =
      authorizeDecisionTraceRequest(
        request("Bearer "),
      );

    expect(result).toEqual({
      allowed: false,
      status: 401,
      error:
        "Decision trace authorization required.",
    });
  });

  it("accepts the configured bearer token", () => {
    process.env.DECISION_TRACE_ACCESS_TOKEN =
      "test-secret";

    const result =
      authorizeDecisionTraceRequest(
        request("Bearer test-secret"),
      );

    expect(result).toEqual({
      allowed: true,
    });
  });

  it("trims the configured token", () => {
    process.env.DECISION_TRACE_ACCESS_TOKEN =
      "  test-secret  ";

    const result =
      authorizeDecisionTraceRequest(
        request("Bearer test-secret"),
      );

    expect(result).toEqual({
      allowed: true,
    });
  });
});
