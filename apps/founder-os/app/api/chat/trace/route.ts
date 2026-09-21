import { NextRequest, NextResponse } from "next/server";

import { answer } from "@/lib/chat/answer";
import { authorizeDecisionTraceRequest } from "@/lib/agents/decisionTrace/access";

import type { DecisionTrace } from "@/lib/agents/decisionTrace/types";

const MAX_MESSAGE_LENGTH = 10_000;

function badRequest(error: string) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  const access =
    authorizeDecisionTraceRequest(req);

  if (!access.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: access.error,
      },
      { status: access.status },
    );
  }

  try {
    const body = await req.json();

    if (
      !body ||
      typeof body !== "object" ||
      typeof body.message !== "string"
    ) {
      return badRequest("Message is required.");
    }

    const message = body.message.trim();

    if (!message) {
      return badRequest("Message is required.");
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return badRequest(
        `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      );
    }

    let trace: DecisionTrace | null = null;

    const response = await answer(message, {
      onDecisionTrace: (decisionTrace) => {
        trace = decisionTrace;
      },
    });

    return NextResponse.json({
      success: true,
      response,
      trace,
    });
  } catch (error) {
    console.error(
      "❌ Chat trace request failed",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process the chat trace request.",
      },
      { status: 500 },
    );
  }
}
