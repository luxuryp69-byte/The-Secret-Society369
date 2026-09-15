import { getKernel } from "@/lib/kernel/runtime";
import { buildMemoryContext } from "@/lib/memory/context";
import { ceoAgent } from "@/lib/agents/ceo";
import { KnowledgeQueryService } from "@/lib/knowledge/query/knowledgeQueryService";
import { AgentKnowledgeService } from "@/lib/agents/knowledge/agentKnowledgeService";

export async function answer(
  message: string,
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
    },
  );
}
