import { useState, type FormEvent, type ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCategories } from "@/hooks/useProducts"
import { PRICE_RANGES, type PriceRange } from "@/lib/constants"
import { formatWholePrice } from "@/lib/format"
import type { CatalogFilters, Category } from "@/types/api"

type Props = {
  filters: CatalogFilters
  onChange: (patch: Partial<CatalogFilters>) => void
}

export function FilterSidebar({ filters, onChange }: Props) {
  const hasActiveFilters =
    !!filters.category_id || !!filters.min_price || !!filters.max_price || !!filters.has_discount

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 text-sm" aria-label="Filters">
      <DepartmentFilter
        selectedId={filters.category_id}
        onSelect={(category_id) => onChange({ category_id })}
      />

      <PriceFilter
        min={filters.min_price}
        max={filters.max_price}
        onSelect={(range) =>
          onChange({ min_price: range.min?.toString(), max_price: range.max?.toString() })
        }
      />

      <FilterGroup title="Deals & Discounts">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!!filters.has_discount}
            onChange={(e) => onChange({ has_discount: e.target.checked || undefined })}
            className="size-4"
          />
          All Discounts
        </label>
      </FilterGroup>

      {hasActiveFilters && (
        // Keeps the search text — only the sidebar filters are cleared
        <button
          onClick={() =>
            onChange({
              category_id: undefined,
              min_price: undefined,
              max_price: undefined,
              has_discount: undefined,
            })
          }
          className="self-start text-brand-text hover:underline"
        >
          Clear all filters
        </button>
      )}
    </aside>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-bold">{title}</h3>
      {children}
    </section>
  )
}

// A filter option that looks like an Amazon sidebar link
function FilterLink({
  active,
  indent,
  onClick,
  children,
}: {
  active?: boolean
  indent?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-left hover:text-brand-text ${active ? "font-bold" : ""} ${indent ? "pl-3" : ""}`}
    >
      {children}
    </button>
  )
}

// Amazon-style department drill-down:
//   nothing selected → list of departments
//   department/subcategory selected → "‹ Any Department", the department, its subcategories
function DepartmentFilter({
  selectedId,
  onSelect,
}: {
  selectedId?: string
  onSelect: (id: string | undefined) => void
}) {
  const { data: categories = [] } = useCategories()

  const selected = categories.find((c) => c.id === selectedId)
  // If a subcategory is selected, show its parent department's tree
  const department: Category | undefined = selected?.parent_id
    ? categories.find((c) => c.id === selected.parent_id)
    : selected
  const departments = categories.filter((c) => c.parent_id === null)
  const subcategories = department ? categories.filter((c) => c.parent_id === department.id) : []

  return (
    <FilterGroup title="Department">
      {department ? (
        <>
          <button
            onClick={() => onSelect(undefined)}
            className="flex items-center text-left hover:text-brand-text"
          >
            <ChevronLeft className="size-4" /> Any Department
          </button>
          <FilterLink active={department.id === selectedId} onClick={() => onSelect(department.id)}>
            {department.name}
          </FilterLink>
          {subcategories.map((sub) => (
            <FilterLink key={sub.id} indent active={sub.id === selectedId} onClick={() => onSelect(sub.id)}>
              {sub.name}
            </FilterLink>
          ))}
        </>
      ) : (
        departments.map((d) => (
          <FilterLink key={d.id} onClick={() => onSelect(d.id)}>
            {d.name}
          </FilterLink>
        ))
      )}
    </FilterGroup>
  )
}

function priceRangeLabel({ min, max }: PriceRange): string {
  if (min === undefined && max !== undefined) return `Under ${formatWholePrice(max)}`
  if (max === undefined && min !== undefined) return `${formatWholePrice(min)} & Above`
  return `${formatWholePrice(min ?? 0)} to ${formatWholePrice(max ?? 0)}`
}

function PriceFilter({
  min,
  max,
  onSelect,
}: {
  min?: string
  max?: string
  onSelect: (range: PriceRange) => void
}) {
  const isActive = (range: PriceRange) =>
    range.min?.toString() === min && range.max?.toString() === max

  return (
    <FilterGroup title="Price">
      {PRICE_RANGES.map((range) => (
        <FilterLink key={priceRangeLabel(range)} active={isActive(range)} onClick={() => onSelect(range)}>
          {priceRangeLabel(range)}
        </FilterLink>
      ))}
      {/* key: reset the inputs when the URL's min/max change (e.g. a range link was clicked) */}
      <CustomPriceForm key={`${min}-${max}`} min={min} max={max} onSubmit={onSelect} />
    </FilterGroup>
  )
}

function CustomPriceForm({
  min,
  max,
  onSubmit,
}: {
  min?: string
  max?: string
  onSubmit: (range: PriceRange) => void
}) {
  const [minText, setMinText] = useState(min ?? "")
  const [maxText, setMaxText] = useState(max ?? "")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      min: minText ? Number(minText) : undefined,
      max: maxText ? Number(maxText) : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 flex items-center gap-1">
      <Input
        type="number"
        min={0}
        placeholder="Min"
        aria-label="Minimum price"
        value={minText}
        onChange={(e) => setMinText(e.target.value)}
        className="h-8 w-16 px-2"
      />
      <Input
        type="number"
        min={0}
        placeholder="Max"
        aria-label="Maximum price"
        value={maxText}
        onChange={(e) => setMaxText(e.target.value)}
        className="h-8 w-16 px-2"
      />
      <Button type="submit" variant="outline" size="sm">
        Go
      </Button>
    </form>
  )
}
