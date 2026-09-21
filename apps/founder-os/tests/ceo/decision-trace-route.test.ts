import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { NextRequest } from "next/server";

const { answerMock } = vi.hoisted(() => ({
  answerMock: vi.fn(),
}));

vi.mock("@/lib/chat/answer", () => ({
  answer: answerMock,
}));

import { POST } from "@/app/api/chat/trace/route";

const TEST_TOKEN = "test-trace-token";

function createRequest(
  body: unknown,
  authorization?: string,
): NextRequest {
  return new NextRequest(
    "http://localhost/api/chat/trace",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorization
          ? {
              authorization,
            }
          : {}),
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/chat/trace", () => {
  const originalToken =
    process.env.DECISION_TRACE_ACCESS_TOKEN;

  beforeEach(() => {
    process.env.DECISION_TRACE_ACCESS_TOKEN =
      TEST_TOKEN;
    answerMock.mockReset();
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.DECISION_TRACE_ACCESS_TOKEN;
    } else {
      process.env.DECISION_TRACE_ACCESS_TOKEN =
        originalToken;
    }
  });

  it("returns the answer and captured DecisionTrace", async () => {
    const trace = {
      traceId: "trace-test-001",
      createdAt:
        "2026-01-01T00:00:00.000Z",
      input: {
        message:
          "How should I validate demand?",
      },
    };

    answerMock.mockImplementation(
      async (
        _message: string,
        options?: {
          onDecisionTrace?: (
            trace: unknown,
          ) => void;
        },
      ) => {
        options?.onDecisionTrace?.(trace);

        return JSON.stringify({
          primaryPriority:
            "Validate demand",
          why: "Test",
          plan: ["A", "B", "C"],
          successCriteria: ["X", "Y"],
          whatNotToPrioritize: "Z",
        });
      },
    );

    const response = await POST(
      createRequest(
        {
          message:
            "How should I validate demand?",
        },
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(200);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: true,
      response: JSON.stringify({
        primaryPriority:
          "Validate demand",
        why: "Test",
        plan: ["A", "B", "C"],
        successCriteria: ["X", "Y"],
        whatNotToPrioritize: "Z",
      }),
      trace,
    });

    expect(answerMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing authorization header", async () => {
    const response = await POST(
      createRequest({
        message: "Test message",
      }),
    );

    expect(response.status).toBe(401);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: false,
      error:
        "Decision trace authorization required.",
    });

    expect(answerMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid authorization token", async () => {
    const response = await POST(
      createRequest(
        {
          message: "Test message",
        },
        "Bearer wrong-token",
      ),
    );

    expect(response.status).toBe(401);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: false,
      error:
        "Invalid decision trace authorization.",
    });

    expect(answerMock).not.toHaveBeenCalled();
  });

  it("fails closed when the access token is not configured", async () => {
    delete process.env.DECISION_TRACE_ACCESS_TOKEN;

    const response = await POST(
      createRequest(
        {
          message: "Test message",
        },
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(503);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: false,
      error:
        "Decision trace access is not configured.",
    });

    expect(answerMock).not.toHaveBeenCalled();
  });

  it("returns a null trace if answer completes without an observer event", async () => {
    answerMock.mockResolvedValue("answer");

    const response = await POST(
      createRequest(
        {
          message: "Test message",
        },
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(200);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: true,
      response: "answer",
      trace: null,
    });
  });

  it("trims the message before calling answer", async () => {
    answerMock.mockResolvedValue("answer");

    const response = await POST(
      createRequest(
        {
          message: "  Test message  ",
        },
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(200);

    expect(answerMock).toHaveBeenCalledWith(
      "Test message",
      expect.objectContaining({
        onDecisionTrace:
          expect.any(Function),
      }),
    );
  });

  it("rejects a missing message", async () => {
    const response = await POST(
      createRequest(
        {},
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(400);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: false,
      error: "Message is required.",
    });

    expect(answerMock).not.toHaveBeenCalled();
  });

  it("rejects an empty message", async () => {
    const response = await POST(
      createRequest(
        {
          message: "   ",
        },
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(400);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: false,
      error: "Message is required.",
    });

    expect(answerMock).not.toHaveBeenCalled();
  });

  it("rejects messages longer than the API limit", async () => {
    const response = await POST(
      createRequest(
        {
          message: "a".repeat(10_001),
        },
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(400);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: false,
      error:
        "Message must be 10000 characters or fewer.",
    });

    expect(answerMock).not.toHaveBeenCalled();
  });

  it("returns 500 when answer fails", async () => {
    answerMock.mockRejectedValue(
      new Error("boom"),
    );

    const response = await POST(
      createRequest(
        {
          message: "Test message",
        },
        `Bearer ${TEST_TOKEN}`,
      ),
    );

    expect(response.status).toBe(500);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: false,
      error:
        "Unable to process the chat trace request.",
    });
  });

  it("does not alter the existing /api/chat response contract", async () => {
    const chatRoute =
      await import("@/app/api/chat/route");

    answerMock.mockResolvedValue(
      "existing-answer",
    );

    const response =
      await chatRoute.POST(
        new NextRequest(
          "http://localhost/api/chat",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              message: "Test message",
            }),
          },
        ),
      );

    expect(response.status).toBe(200);

    await expect(
      response.json(),
    ).resolves.toEqual({
      success: true,
      response: "existing-answer",
    });

    expect(answerMock).toHaveBeenCalledWith(
      "Test message",
    );
  });
});
