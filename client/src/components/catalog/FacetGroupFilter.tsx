import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { AttributeType, FACET_VISIBLE_OPTIONS } from "@/lib/constants"
import type { FacetGroup } from "@/types/api"

type Props = {
  group: FacetGroup
  onToggle: (value: string) => void
}

// One dynamic filter group from the search response, e.g.
//   Brand                         Screen Size
//   ☐ Sony (75)                   ☐ Up to 33 in (73)
//   ☑ LG (67)                     ☐ 33 to 45 in (47)
//   ▾ See more                    …
// Booleans ("Noise Cancelling") are a single checkbox under the group title.
export function FacetGroupFilter({ group, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Selected options always stay visible, even when collapsed
  const hidden = group.options.slice(FACET_VISIBLE_OPTIONS).filter((o) => !o.selected)
  const visible = expanded ? group.options : group.options.filter((o, i) => i < FACET_VISIBLE_OPTIONS || o.selected)

  return (
    <section className="flex flex-col gap-1.5">
      {group.type !== AttributeType.Boolean && <h3 className="font-bold">{group.label}</h3>}

      {visible.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-center gap-2 hover:text-brand-text">
          <input
            type="checkbox"
            checked={option.selected}
            onChange={() => onToggle(option.value)}
            className="size-4 shrink-0"
          />
          <span className="min-w-0 truncate">{option.label}</span>
          <span className="text-xs text-muted-foreground">({option.count})</span>
        </label>
      ))}

      {hidden.length > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 self-start text-brand-text hover:underline"
        >
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </section>
  )
}
