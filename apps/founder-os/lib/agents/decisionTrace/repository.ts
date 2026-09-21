import type { DecisionTrace } from "./types";

export interface DecisionTraceRepository {
  save(trace: DecisionTrace): Promise<void>;
  get(traceId: string): Promise<DecisionTrace | null>;
}
