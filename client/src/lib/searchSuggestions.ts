import type { ProductSuggestion } from "@/types/api"

// One row in the autocomplete dropdown: either a query completion or a product
export type Suggestion =
  | { kind: "query"; text: string }
  | { kind: "product"; product: ProductSuggestion }

// DOM id of a row — lets the input point at the highlighted row via aria-activedescendant
export const suggestionOptionId = (listId: string, index: number) => `${listId}-option-${index}`
