import { getKernel } from "@/lib/kernel/runtime";
import { buildMemoryContext } from "@/lib/memory/context";
import { ceoAgent } from "@/lib/agents/ceo";

export async function answer(message: string): Promise<string> {
  await getKernel();

  const context = await buildMemoryContext();

  return ceoAgent(message, context);
}
