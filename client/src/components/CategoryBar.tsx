import { Link } from "react-router"
import { Menu } from "lucide-react"
import { catalogUrl } from "@/hooks/useCatalogParams"
import { useCategories } from "@/hooks/useProducts"

const NAV_ITEM = "whitespace-nowrap rounded-sm border border-transparent px-2 py-1 hover:border-nav-foreground"

// Second row of the header: quick links to each department
export function CategoryBar() {
  const { data: categories } = useCategories()
  const departments = categories?.filter((c) => c.parent_id === null) ?? []

  return (
    <nav
      aria-label="Departments"
      className="flex items-center gap-1 overflow-x-auto bg-nav-secondary px-4 py-1 text-sm text-nav-foreground"
    >
      <Link to={catalogUrl()} className={`${NAV_ITEM} flex items-center gap-1 font-semibold`}>
        <Menu className="size-4" /> All
      </Link>
      <Link to={catalogUrl({ has_discount: true })} className={NAV_ITEM}>
        Today's Deals
      </Link>
      {departments.map((d) => (
        <Link key={d.id} to={catalogUrl({ category_id: d.id })} className={NAV_ITEM}>
          {d.name}
        </Link>
      ))}
    </nav>
  )
}
