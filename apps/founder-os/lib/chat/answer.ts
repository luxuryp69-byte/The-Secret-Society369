import { getKernel } from "@/lib/kernel/runtime";
import { buildMemoryContext } from "@/lib/memory/context";
import { ceoAgent } from "@/lib/agents/ceo";
import { KnowledgeQueryService } from "@/lib/knowledge/query/knowledgeQueryService";
import { AgentKnowledgeService } from "@/lib/agents/knowledge/agentKnowledgeService";
import type { DecisionTrace } from "@/lib/agents/decisionTrace/types";
import { saveDecisionTrace } from "@/lib/agents/decisionTrace/store";

export interface AnswerOptions {
  onDecisionTrace?: (trace: DecisionTrace) => void;
}

async function persistTraceSafely(
  trace: DecisionTrace,
): Promise<void> {
  try {
    await saveDecisionTrace(trace);
  } catch (error) {
    console.warn(
      "⚠️ Decision Trace persistence failed. Continuing without persistence.",
      error,
    );
  }
}

export async function answer(
  message: string,
  options: AnswerOptions = {},
): Promise<string> {
  await getKernel();

  const memory = await buildMemoryContext();

  const knowledgeQueryService =
    new KnowledgeQueryService();

  const agentKnowledgeService =
    new AgentKnowledgeService(
      knowledgeQueryService,
    );

  const knowledge =
    await agentKnowledgeService.getContext(
      message,
    );

  let capturedTrace: DecisionTrace | null =
    null;

  const response = await ceoAgent(
    message,
    {
      memory,
      knowledge,
      onDecisionTrace: (trace) => {
        capturedTrace = trace;
      },
    },
  );

  if (capturedTrace !== null) {
    await persistTraceSafely(capturedTrace);

    if (options.onDecisionTrace) {
      try {
        options.onDecisionTrace(capturedTrace);
      } catch {
        // Trace observers are non-critical and must never alter the answer contract.
      }
    }
  }

  return response;
}
