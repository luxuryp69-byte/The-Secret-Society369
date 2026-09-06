import { ceoAgent } from "./ceo";

export async function runAgent(
  message: string,
  context: Parameters<typeof ceoAgent>[1],
) {
  return ceoAgent(message, context);
}
