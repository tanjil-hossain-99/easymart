import { Search } from "lucide-react"
import { suggestionOptionId, type Suggestion } from "@/lib/searchSuggestions"

type Props = {
  id: string // for aria-controls on the input
  typed: string
  suggestions: Suggestion[]
  activeIndex: number // row highlighted by arrow keys (-1 = none)
  onHover: (index: number) => void
  onSelect: (suggestion: Suggestion) => void
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
          key={suggestion.kind === "query" ? `q-${suggestion.text}` : `p-${suggestion.product.id}`}
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
          {suggestion.kind === "query" ? (
            <>
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <HighlightCompletion text={suggestion.text} typed={typed} />
            </>
          ) : (
            <>
              {suggestion.product.primary_image ? (
                <img
                  src={suggestion.product.primary_image}
                  alt=""
                  className="size-8 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="size-8 shrink-0" />
              )}
              <span className="truncate">{suggestion.product.title}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

// Amazon style: what you typed stays normal, the completion is bold
// ("gra" + "granite chicken" → gra**nite chicken**)
function HighlightCompletion({ text, typed }: { text: string; typed: string }) {
  const prefix = typed.toLowerCase()
  if (!text.startsWith(prefix)) return <span className="font-semibold">{text}</span>

  return (
    <span>
      {text.slice(0, prefix.length)}
      <span className="font-semibold">{text.slice(prefix.length)}</span>
    </span>
  )
}
