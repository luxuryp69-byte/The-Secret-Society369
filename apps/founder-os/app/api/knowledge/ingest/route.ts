import { NextRequest, NextResponse } from "next/server";
import { ingestSource } from "@/lib/knowledge/ingestion/ingestSource";

const MAX_URL_LENGTH = 2_048;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (
      !body ||
      typeof body !== "object" ||
      typeof body.url !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "URL is required." },
        { status: 400 },
      );
    }

    const url = body.url.trim();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required." },
        { status: 400 },
      );
    }

    if (url.length > MAX_URL_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `URL must be ${MAX_URL_LENGTH} characters or fewer.`,
        },
        { status: 400 },
      );
    }

    try {
      const parsed = new URL(url);

      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Unsupported protocol.");
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "A valid HTTP or HTTPS URL is required." },
        { status: 400 },
      );
    }

    const result = await ingestSource(url);

    return NextResponse.json(
      {
        success: true,
        source: result.source,
        items: result.items,
        count: result.items.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Knowledge ingestion failed", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to ingest knowledge source.",
      },
      { status: 500 },
    );
  }
}
