import { WorkingMemory } from "../working/WorkingMemory";

export class ContextWindow {
  constructor(
    private readonly workingMemory = new WorkingMemory()
  ) {}

  snapshot() {
    return this.workingMemory.getAll();
  }
}
