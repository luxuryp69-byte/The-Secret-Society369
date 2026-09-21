import { NextRequest, NextResponse } from "next/server";

import { authorizeDecisionTraceRequest } from "@/lib/agents/decisionTrace/access";
import { getDecisionTrace } from "@/lib/agents/decisionTrace/store";

interface RouteContext {
  params: Promise<{
    traceId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const access =
    authorizeDecisionTraceRequest(request);

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
    const { traceId } = await context.params;

    const trace =
      await getDecisionTrace(traceId);

    if (trace === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Decision trace not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      trace,
    });
  } catch (error) {
    console.error(
      "❌ Decision trace retrieval failed",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to retrieve the decision trace.",
      },
      { status: 500 },
    );
  }
}
