import { NextRequest, NextResponse } from "next/server";

import { answer } from "@/lib/chat/answer";

const MAX_MESSAGE_LENGTH = 10_000;

function badRequest(response: string) {
  return NextResponse.json(
    {
      success: false,
      response,
    },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
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

    const response = await answer(message);

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("❌ Chat request failed", error);

    return NextResponse.json(
      {
        success: false,
        response: "Unable to process the chat request.",
      },
      { status: 500 },
    );
  }
}
