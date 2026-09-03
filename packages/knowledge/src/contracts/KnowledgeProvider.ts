export interface KnowledgeProvider {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}
