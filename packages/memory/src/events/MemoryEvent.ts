export interface MemoryEvent {
  id: string;

  type: string;

  timestamp: Date;

  payload?: unknown;
}
