import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { NextRequest } from "next/server";

const {
  getDecisionTraceMock,
} = vi.hoisted(() => ({
  getDecisionTraceMock: vi.fn(),
}));

vi.mock(
  "@/lib/agents/decisionTrace/store",
  () => ({
    getDecisionTrace:
      getDecisionTraceMock,
  }),
);

import { GET } from "@/app/api/chat/trace/[traceId]/route";

const TEST_TOKEN = "test-trace-token";

describe(
  "GET /api/chat/trace/[traceId]",
  () => {
    const originalToken =
      process.env.DECISION_TRACE_ACCESS_TOKEN;

    beforeEach(() => {
      process.env.DECISION_TRACE_ACCESS_TOKEN =
        TEST_TOKEN;

      getDecisionTraceMock.mockReset();
    });

    afterEach(() => {
      if (originalToken === undefined) {
        delete process.env.DECISION_TRACE_ACCESS_TOKEN;
      } else {
        process.env.DECISION_TRACE_ACCESS_TOKEN =
          originalToken;
      }
    });

    function createRequest(
      traceId: string,
      authorization?: string,
    ): NextRequest {
      return new NextRequest(
        `http://localhost/api/chat/trace/${traceId}`,
        {
          headers: authorization
            ? {
                authorization,
              }
            : undefined,
        },
      );
    }

    function context(traceId: string) {
      return {
        params: Promise.resolve({
          traceId,
        }),
      };
    }

    it("returns the requested trace", async () => {
      const trace = {
        traceId: "trace-123",
        createdAt:
          "2026-09-20T00:00:00.000Z",
      };

      getDecisionTraceMock.mockResolvedValue(
        trace,
      );

      const response = await GET(
        createRequest(
          "trace-123",
          `Bearer ${TEST_TOKEN}`,
        ),
        context("trace-123"),
      );

      expect(response.status).toBe(200);

      await expect(
        response.json(),
      ).resolves.toEqual({
        success: true,
        trace,
      });

      expect(
        getDecisionTraceMock,
      ).toHaveBeenCalledWith(
        "trace-123",
      );
    });

    it("rejects a missing authorization header", async () => {
      const response = await GET(
        createRequest("trace-123"),
        context("trace-123"),
      );

      expect(response.status).toBe(401);

      await expect(
        response.json(),
      ).resolves.toEqual({
        success: false,
        error:
          "Decision trace authorization required.",
      });

      expect(
        getDecisionTraceMock,
      ).not.toHaveBeenCalled();
    });

    it("rejects an invalid authorization token", async () => {
      const response = await GET(
        createRequest(
          "trace-123",
          "Bearer wrong-token",
        ),
        context("trace-123"),
      );

      expect(response.status).toBe(401);

      await expect(
        response.json(),
      ).resolves.toEqual({
        success: false,
        error:
          "Invalid decision trace authorization.",
      });

      expect(
        getDecisionTraceMock,
      ).not.toHaveBeenCalled();
    });

    it("fails closed when the access token is not configured", async () => {
      delete process.env.DECISION_TRACE_ACCESS_TOKEN;

      const response = await GET(
        createRequest(
          "trace-123",
          `Bearer ${TEST_TOKEN}`,
        ),
        context("trace-123"),
      );

      expect(response.status).toBe(503);

      await expect(
        response.json(),
      ).resolves.toEqual({
        success: false,
        error:
          "Decision trace access is not configured.",
      });

      expect(
        getDecisionTraceMock,
      ).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown trace", async () => {
      getDecisionTraceMock.mockResolvedValue(
        null,
      );

      const response = await GET(
        createRequest(
          "missing",
          `Bearer ${TEST_TOKEN}`,
        ),
        context("missing"),
      );

      expect(response.status).toBe(404);

      await expect(
        response.json(),
      ).resolves.toEqual({
        success: false,
        error:
          "Decision trace not found.",
      });
    });

    it("returns 500 when persistence retrieval fails", async () => {
      getDecisionTraceMock.mockRejectedValue(
        new Error("storage unavailable"),
      );

      const response = await GET(
        createRequest(
          "trace-123",
          `Bearer ${TEST_TOKEN}`,
        ),
        context("trace-123"),
      );

      expect(response.status).toBe(500);

      await expect(
        response.json(),
      ).resolves.toEqual({
        success: false,
        error:
          "Unable to retrieve the decision trace.",
      });
    });
  },
);
