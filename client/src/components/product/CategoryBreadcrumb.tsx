import { Fragment } from "react"
import { Link } from "react-router"
import { ChevronRight } from "lucide-react"
import { catalogUrl } from "@/hooks/useCatalogParams"
import { useCategories } from "@/hooks/useProducts"

// "Music › Soft Music" — each part links to that category's results.
// Replaces a "← Back" button: it works even when the user arrived from a shared link.
export function CategoryBreadcrumb({ categoryId }: { categoryId: string }) {
  const { data: categories = [] } = useCategories()

  const category = categories.find((c) => c.id === categoryId)
  const parent = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : undefined
  const trail = [parent, category].filter((c) => c !== undefined)

  if (trail.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {trail.map((c, index) => (
        <Fragment key={c.id}>
          {index > 0 && <ChevronRight className="size-3" />}
          <Link to={catalogUrl({ category_id: c.id })} className="hover:text-brand-text hover:underline">
            {c.name}
          </Link>
        </Fragment>
      ))}
    </nav>
  )
}
