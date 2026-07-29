export * from "./types";
export * from "./MemoryClient";

import { MemoryClient } from "./MemoryClient";

export const memory = new MemoryClient();