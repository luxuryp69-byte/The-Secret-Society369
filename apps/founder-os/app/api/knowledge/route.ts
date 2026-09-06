import { NextRequest, NextResponse } from "next/server";

import {
  listKnowledge,
  saveKnowledge,
} from "@/lib/knowledge/service";
import type { KnowledgeItem } from "@/lib/knowledge/types";

const MAX_CLAIM_LENGTH = 10_000;

function badRequest(response: string) {
  return NextResponse.json(
    {
      success: false,
      response,
    },
    { status: 400 },
  );
}

function isValidSource(
  source: unknown,
): source is KnowledgeItem["source"] {
  if (!source || typeof source !== "object") {
    return false;
  }

  const value = source as Record<string, unknown>;

  return (
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.publisher === "string" &&
    typeof value.type === "string"
  );
}

function isValidKnowledgeItem(
  value: unknown,
): value is KnowledgeItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.claim === "string" &&
    typeof item.topic === "string" &&
    typeof item.confidence === "number" &&
    Array.isArray(item.tags) &&
    item.tags.every(
      (tag) => typeof tag === "string",
    ) &&
    isValidSource(item.source)
  );
}

export async function GET() {
  try {
    const items = await listKnowledge();

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("❌ Knowledge request failed", error);

    return NextResponse.json(
      {
        success: false,
        response: "Unable to load knowledge.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    if (!isValidKnowledgeItem(body)) {
      return badRequest("Invalid knowledge item.");
    }

    if (!body.claim.trim()) {
      return badRequest("Claim is required.");
    }

    if (body.claim.length > MAX_CLAIM_LENGTH) {
      return badRequest(
        `Claim must be ${MAX_CLAIM_LENGTH} characters or fewer.`,
      );
    }

    if (
      body.confidence < 0 ||
      body.confidence > 100
    ) {
      return badRequest(
        "Confidence must be between 0 and 100.",
      );
    }

    await saveKnowledge(body);

    return NextResponse.json(
      {
        success: true,
        item: body,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Knowledge write failed", error);

    return NextResponse.json(
      {
        success: false,
        response: "Unable to save knowledge.",
      },
      { status: 500 },
    );
  }
}
