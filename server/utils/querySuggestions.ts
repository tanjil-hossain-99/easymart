// Builds Amazon-style query completions from product titles.
//
//   query "gra"          + title "Practical Granite Chicken" → "granite chicken"
//   query "granite ch"   + title "Practical Granite Chicken" → "granite chicken"
//   query "chi"          + title "Practical Granite Chicken" → "chicken"
//
// Rule: find where the typed words appear in the title (earlier words must match
// exactly, the last one is a prefix since the user is still typing it), then
// suggest the title from that point on.
//
// Real stores build suggestions from search analytics (what people actually type).
// We have no traffic yet, so the catalog is the next best source.
export function buildQuerySuggestions(query: string, titles: string[], max: number): string[] {
  const queryWords = toWords(query);
  if (queryWords.length === 0) return [];

  const suggestions = new Set<string>(); // Set = automatic de-duplication

  for (const title of titles) {
    const words = toWords(title);

    for (let start = 0; start + queryWords.length <= words.length; start++) {
      const matches = queryWords.every((queryWord, offset) => {
        const word = words[start + offset];
        const isLastQueryWord = offset === queryWords.length - 1;
        return isLastQueryWord ? word.startsWith(queryWord) : word === queryWord;
      });

      if (matches) {
        suggestions.add(words.slice(start).join(" "));
        break; // one suggestion per title is enough
      }
    }

    if (suggestions.size >= max) break;
  }

  return [...suggestions];
}

function toWords(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}
