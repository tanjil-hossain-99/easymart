import type { QuerySuggestion } from "../types.js";

type Hit = { title: string; primary_image: string | null };

// Titles look like "Apple iPhone 17 Pro Max, 256 GB, Black - Unlocked 5G Smartphone".
// Suggestions should be short like Amazon's ("iphone 17 pro max"), so only the part
// before the first comma / " - " / "(" is used — that's the product name, the rest is specs.
const TITLE_DETAILS_START = /,| - |\(/;
const MAX_EXTRA_WORDS = 4; // at most this many words after what the user typed

// Builds Amazon-style dropdown rows from the products Algolia matched. Every row is a
// search query; the image is just a hint from a product that matches it.
//
// 1. Completions — continue the typed words using product names:
//      query "iph"       + "Apple iPhone 17 Pro Max, 256 GB…" → "iphone 17 pro max"
//      query "iphone 1"  + "Apple iPhone 16 Pro, 1 TB…"       → "iphone 16 pro"
//    (earlier words must match exactly, the last one is a prefix — the user is still typing it)
// 2. Full product names — fill the remaining rows ("apple iphone 16 pro"), so short
//    queries still get a full list, like Amazon's "computer mouse logitech" rows.
//
// Real stores rank suggestions by search analytics (what people actually type).
// We have no traffic yet, so the catalog is the next best source.
export function buildQuerySuggestions(query: string, hits: Hit[], max: number): QuerySuggestion[] {
  const queryWords = toWords(query);
  if (queryWords.length === 0) return [];

  // Map keeps insertion order and de-duplicates by text
  const suggestions = new Map<string, string | null>();
  const add = (text: string, image: string | null) => {
    if (suggestions.size >= max) return;
    // First product that produced a suggestion provides its image; keep it if later ones have none
    if (!suggestions.has(text) || (!suggestions.get(text) && image)) suggestions.set(text, image);
  };

  for (const hit of hits) {
    const completion = completeFromTitle(queryWords, toWords(productName(hit.title)));
    if (completion) add(completion, hit.primary_image);
  }

  for (const hit of hits) add(toWords(productName(hit.title)).join(" "), hit.primary_image);

  return [...suggestions].map(([text, image]) => ({ text, image }));
}

// Where do the typed words appear in the title? Return the title from that point on.
function completeFromTitle(queryWords: string[], titleWords: string[]): string | null {
  for (let start = 0; start + queryWords.length <= titleWords.length; start++) {
    const matches = queryWords.every((queryWord, offset) => {
      const word = titleWords[start + offset];
      const isLastQueryWord = offset === queryWords.length - 1;
      return isLastQueryWord ? word.startsWith(queryWord) : word === queryWord;
    });
    if (matches) return titleWords.slice(start, start + queryWords.length + MAX_EXTRA_WORDS).join(" ");
  }
  return null;
}

function productName(title: string): string {
  return title.split(TITLE_DETAILS_START)[0];
}

function toWords(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}
