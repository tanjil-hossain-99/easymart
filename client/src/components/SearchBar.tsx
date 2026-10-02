import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from "react"
import { useNavigate } from "react-router"
import { Search } from "lucide-react"
import { SearchSuggestions } from "@/components/SearchSuggestions"
import { catalogUrl, useCatalogParams } from "@/hooks/useCatalogParams"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useCategories, useSearchSuggestions } from "@/hooks/useProducts"
import { Key, SEARCH } from "@/lib/constants"
import { suggestionOptionId } from "@/lib/searchSuggestions"
import type { QuerySuggestion } from "@/types/api"

type SearchBarProps = {
  // Tells the header when the search box is active, so it can dim the rest of the page
  onActiveChange: (active: boolean) => void
}

// Amazon-style: [ All departments ▾ | search text | 🔍 ]
export function SearchBar({ onActiveChange }: SearchBarProps) {
  const { filters } = useCatalogParams()
  const q = filters.q ?? ""
  const categoryId = filters.category_id ?? ""

  // When the URL changes from elsewhere (back button, a category link), the new key
  // remounts the form so its local state restarts from the URL — no syncing effect needed.
  return (
    <SearchForm
      key={`${q}|${categoryId}`}
      initialText={q}
      initialDepartment={categoryId}
      onActiveChange={onActiveChange}
    />
  )
}

type SearchFormProps = SearchBarProps & { initialText: string; initialDepartment: string }

const SUGGESTIONS_LIST_ID = "search-suggestions"
const NO_ACTIVE_ROW = -1

function SearchForm({ initialText, initialDepartment, onActiveChange }: SearchFormProps) {
  const navigate = useNavigate()
  const { data: categories } = useCategories()
  const departments = categories?.filter((c) => c.parent_id === null) ?? []

  // Local state while typing; the URL only changes on submit
  const [text, setText] = useState(initialText)
  const [department, setDepartment] = useState(initialDepartment)
  const [isOpen, setIsOpenState] = useState(false)
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_ROW)
  const inputRef = useRef<HTMLInputElement>(null)

  // Open/close always goes through here so the header's overlay stays in sync
  function setIsOpen(open: boolean) {
    setIsOpenState(open)
    onActiveChange(open)
  }

  // This form remounts when the URL changes (see the key above) — make sure a
  // form that disappears while focused doesn't leave the page dimmed
  useEffect(() => () => onActiveChange(false), [onActiveChange])

  // Suggestions follow the text with a short delay, so fast typing = one request
  const typed = useDebouncedValue(text.trim(), SEARCH.suggestionDebounceMs)
  const { data } = useSearchSuggestions(typed, department || undefined)

  const suggestions: QuerySuggestion[] =
    typed.length >= SEARCH.minSuggestionLength && data ? data.suggestions : []
  const showSuggestions = isOpen && suggestions.length > 0

  function runSearch(query: string) {
    setIsOpen(false)
    // Search from any page → go to the catalog with the query in the URL
    navigate(catalogUrl({ q: query.trim() || undefined, category_id: department || undefined }))
  }

  // Every row is a search, like Amazon — even rows with a product image go to
  // the results page, never straight to one product
  function selectSuggestion(suggestion: QuerySuggestion) {
    setText(suggestion.text)
    runSearch(suggestion.text)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const active = suggestions[activeIndex]
    if (showSuggestions && active) selectSuggestion(active)
    else runSearch(text)
  }

  // Focus moving between parts of the search (department ▾ → input → button) is not
  // "leaving the search". Only close when focus goes somewhere outside the whole area.
  // relatedTarget = the element receiving focus (null when clicking empty page space).
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === Key.Escape) {
      // type="search" inputs clear their text on Esc natively — that fires onChange,
      // which would immediately re-open everything. We just want to close.
      e.preventDefault()
      setIsOpen(false)
      return
    }

    if (!showSuggestions) return
    const last = suggestions.length - 1

    switch (e.key) {
      case Key.ArrowDown:
        e.preventDefault() // don't move the text cursor
        setActiveIndex((i) => (i >= last ? 0 : i + 1)) // wrap around
        break
      case Key.ArrowUp:
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? last : i - 1))
        break
    }
  }

  return (
    // Wrapper is the positioning context for the dropdown. The dropdown sits outside
    // the <form> because the form's overflow-hidden (for rounded corners) would clip it.
    // onFocus/onBlur here catch focus changes of every element inside (React's focus events bubble)
    <div className="relative flex-1" onFocus={() => setIsOpen(true)} onBlur={handleBlur}>
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex h-10 overflow-hidden rounded-md focus-within:ring-3 focus-within:ring-brand"
      >
        <select
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value)
            // Back to the text box so the user can keep typing, like Amazon
            inputRef.current?.focus()
          }}
          aria-label="Department"
          className="max-w-40 border-r bg-muted px-2 text-xs text-foreground"
        >
          <option value="">All</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <input
          ref={inputRef}
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setIsOpen(true)
            setActiveIndex(NO_ACTIVE_ROW)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search TcMart"
          autoComplete="off" // hide the browser's own history dropdown
          // Combobox ARIA: screen readers announce the list and the highlighted row
          role="combobox"
          aria-label="Search"
          aria-expanded={showSuggestions}
          aria-controls={SUGGESTIONS_LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={
            showSuggestions && activeIndex !== NO_ACTIVE_ROW
              ? suggestionOptionId(SUGGESTIONS_LIST_ID, activeIndex)
              : undefined
          }
          className="min-w-0 flex-1 bg-background px-3 text-foreground outline-none"
        />

        <button
          type="submit"
          aria-label="Search"
          className="flex w-12 items-center justify-center bg-brand text-brand-foreground hover:bg-brand-hover"
        >
          <Search className="size-5" />
        </button>
      </form>

      {showSuggestions && (
        <SearchSuggestions
          id={SUGGESTIONS_LIST_ID}
          typed={typed}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onSelect={selectSuggestion}
        />
      )}
    </div>
  )
}
