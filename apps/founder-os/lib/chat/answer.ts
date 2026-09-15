import { getKernel } from "@/lib/kernel/runtime";
import { buildMemoryContext } from "@/lib/memory/context";
import { ceoAgent } from "@/lib/agents/ceo";
import { KnowledgeQueryService } from "@/lib/knowledge/query/knowledgeQueryService";

export async function answer(
  message: string,
): Promise<string> {
  await getKernel();

  const memory = await buildMemoryContext();

  const knowledgeService =
    new KnowledgeQueryService();

  const knowledgeResult =
    await knowledgeService.query(message);

  const knowledge = knowledgeResult.trustedAnswer
    ? {
        status: knowledgeResult.status,
        query: knowledgeResult.query,
        matchedItems:
          knowledgeResult.matchedItems,
        trustedAnswer:
          knowledgeResult.trustedAnswer,
      }
    : {
        status: "NO_MATCH" as const,
        query: knowledgeResult.query,
        matchedItems: 0,
        trustedAnswer: null,
      };

  return ceoAgent(
    message,
    {
      memory,
      knowledge,
    },
  );
}
