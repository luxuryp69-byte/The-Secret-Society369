import { NextRequest, NextResponse } from "next/server";

import { answer } from "@/lib/chat/answer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (
      !body ||
      typeof body.message !== "string" ||
      !body.message.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          response: "Message is required.",
        },
        { status: 400 },
      );
    }

    const response = await answer(body.message.trim());

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("❌ Chat request failed", error);

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        success: false,
        response: message,
      },
      { status: 500 },
    );
  }
}
