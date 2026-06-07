/**
 * Lightweight subsequence fuzzy matcher (true vibecoding)
 */
export function fuzzyScore(text: string, query: string): number {
  if (!query) return 0;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();

  let score = 0;
  let textIndex = 0;
  let queryIndex = 0;
  let previousMatchIndex = -1;

  while (textIndex < haystack.length && queryIndex < needle.length) {
    if (haystack[textIndex] === needle[queryIndex]) {
      // Contiguous matches and boundary matches score higher
      if (previousMatchIndex === textIndex - 1) score += 5;
      if (textIndex === 0 || /[\s\-/_.]/.test(haystack[textIndex - 1]))
        score += 3;
      score += 1;
      previousMatchIndex = textIndex;
      queryIndex += 1;
    }
    textIndex += 1;
  }

  // All query characters must be consumed for a match
  return queryIndex === needle.length ? score : -1;
}
