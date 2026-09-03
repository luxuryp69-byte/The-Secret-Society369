export function semanticSearch(
  query: string,
  memories: string[],
  limit = 20
): string[] {

  const words =
    query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

  return memories
    .map(memory => {

      const text =
        memory.toLowerCase();

      let score = 0;

      for (const word of words) {
        if (text.includes(word)) {
          score++;
        }
      }

      return {
        memory,
        score,
      };

    })
    .sort(
      (a,b) =>
        b.score - a.score
    )
    .slice(0, limit)
    .map(
      item => item.memory
    );

}
