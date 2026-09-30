import { Link } from "react-router"
import { SearchX } from "lucide-react"
import { catalogUrl } from "@/hooks/useCatalogParams"
import { ROUTES } from "@/lib/constants"

type Props = {
  // What wasn't found — defaults to the page itself, but e.g. the product page passes "product"
  thing?: string
}

// Shown for any URL that matches no route, and for links to things that don't exist
// (e.g. a deleted product). The header stays, so the customer can search right away.
export function NotFoundPage({ thing = "page" }: Props) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
      <SearchX className="size-16 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-3xl font-bold">Sorry, we couldn't find that {thing}</h1>
      <p className="text-muted-foreground">
        The link may be broken, or the {thing} may have been removed. Try searching above, or start from one of these:
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to={ROUTES.home}
          className="rounded-full bg-brand px-5 py-2 font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Go to the homepage
        </Link>
        <Link to={catalogUrl({ has_discount: true })} className="rounded-full border px-5 py-2 hover:bg-muted">
          See today's deals
        </Link>
      </div>
    </div>
  )
}
