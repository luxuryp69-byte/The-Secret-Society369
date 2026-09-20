import { getKernel } from "@/lib/kernel/runtime";
import { buildMemoryContext } from "@/lib/memory/context";
import { ceoAgent } from "@/lib/agents/ceo";
import { KnowledgeQueryService } from "@/lib/knowledge/query/knowledgeQueryService";
import { AgentKnowledgeService } from "@/lib/agents/knowledge/agentKnowledgeService";
import type { DecisionTrace } from "@/lib/agents/decisionTrace/types";

export interface AnswerOptions {
  onDecisionTrace?: (trace: DecisionTrace) => void;
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

  return ceoAgent(
    message,
    {
      memory,
      knowledge,
      onDecisionTrace: options.onDecisionTrace
        ? (trace) => {
            try {
              options.onDecisionTrace?.(trace);
            } catch {
              // Trace observers are non-critical and must never alter the answer contract.
            }
          }
        : undefined,
    },
  );
}
