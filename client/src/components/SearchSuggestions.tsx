import { Search } from "lucide-react"
import { suggestionOptionId } from "@/lib/searchSuggestions"
import type { QuerySuggestion } from "@/types/api"

type Props = {
  id: string // for aria-controls on the input
  typed: string
  suggestions: QuerySuggestion[]
  activeIndex: number // row highlighted by arrow keys (-1 = none)
  onHover: (index: number) => void
  onSelect: (suggestion: QuerySuggestion) => void
}

export function SearchSuggestions({ id, typed, suggestions, activeIndex, onHover, onSelect }: Props) {
  return (
    <ul
      id={id}
      role="listbox"
      className="absolute top-full right-0 left-0 z-50 border bg-popover py-1 text-popover-foreground shadow-lg"
    >
      {suggestions.map((suggestion, index) => (
        <li
          key={suggestion.text}
          id={suggestionOptionId(id, index)}
          role="option"
          aria-selected={index === activeIndex}
          onMouseEnter={() => onHover(index)}
          // mousedown, not click: click fires after the input's blur, which would
          // close the dropdown before the click lands
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(suggestion)
          }}
          className={`flex cursor-pointer items-center gap-3 px-3 py-1.5 ${
            index === activeIndex ? "bg-muted" : ""
          }`}
        >
          {/* Fixed-size slot so text lines up whether the row has an image or the icon */}
          <span className="flex size-8 shrink-0 items-center justify-center">
            {suggestion.image ? (
              <img src={suggestion.image} alt="" className="size-8 rounded object-cover" />
            ) : (
              <Search className="size-5 text-muted-foreground" />
            )}
          </span>
          <HighlightTyped text={suggestion.text} typed={typed} />
        </li>
      ))}
    </ul>
  )
}

// Amazon style: what you typed stays normal, everything else is bold.
//   "gra" in "granite chicken"           → gra**nite chicken**
//   "gra" in "practical granite chicken" → **practical** gra**nite chicken**
function HighlightTyped({ text, typed }: { text: string; typed: string }) {
  const prefix = typed.toLowerCase()
  const index = findWordStart(text, prefix)

  if (!prefix || index === NOT_FOUND) {
    return <span className="truncate font-semibold">{text}</span>
  }

  return (
    <span className="truncate">
      <span className="font-semibold">{text.slice(0, index)}</span>
      {text.slice(index, index + prefix.length)}
      <span className="font-semibold">{text.slice(index + prefix.length)}</span>
    </span>
  )
}

const NOT_FOUND = -1

// Position of `prefix` at the start of a word in `text`, so "gra" matches
// "granite" but doesn't light up inside "photograph"
function findWordStart(text: string, prefix: string): number {
  if (text.startsWith(prefix)) return 0
  const afterSpace = text.indexOf(` ${prefix}`)
  return afterSpace === NOT_FOUND ? NOT_FOUND : afterSpace + 1
}
