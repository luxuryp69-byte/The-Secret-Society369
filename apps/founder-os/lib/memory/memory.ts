import { loadMemory, saveMemory } from "./store";

export async function memory() {

  const data = await loadMemory();

  return {

    get() {
      return data;
    },

    async save() {
      await saveMemory(data);
    },

  };

}
