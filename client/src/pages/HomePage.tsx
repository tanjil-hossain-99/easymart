import { Link } from "react-router"
import { ProductRow } from "@/components/home/ProductRow"
import { catalogUrl } from "@/hooks/useCatalogParams"
import { useCategories } from "@/hooks/useProducts"
import { HOME, ProductSort } from "@/lib/constants"

export function HomePage() {
  const { data: categories = [] } = useCategories()
  const departments = categories.filter((c) => c.parent_id === null)

  return (
    <div className="flex flex-col gap-6 bg-muted pb-8">
      {/* Hero banner */}
      <section className="bg-gradient-to-b from-nav-secondary to-muted px-6 pt-12 pb-20 text-nav-foreground">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold">Big savings, every day</h1>
          <p className="mt-2 max-w-xl text-lg opacity-90">
            Thousands of products with discounts up to 70% — delivered to your door.
          </p>
          <Link
            to={catalogUrl({ has_discount: true, sort: ProductSort.DiscountDesc })}
            className="mt-6 inline-block rounded-full bg-brand px-6 py-2 font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Shop today's deals
          </Link>
        </div>
      </section>

      {/* Negative margin pulls the content up over the banner, like Amazon's homepage */}
      <div className="mx-auto -mt-16 flex w-full max-w-6xl flex-col gap-6 px-4">
        <ProductRow
          title="Today's deals"
          filters={{ sort: ProductSort.DiscountDesc, limit: HOME.rowSize }}
          seeAllUrl={catalogUrl({ has_discount: true, sort: ProductSort.DiscountDesc })}
        />

        <section className="rounded-md bg-card p-4">
          <h2 className="mb-3 text-xl font-bold">Shop by department</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {departments.map((d) => (
              <li key={d.id}>
                <Link
                  to={catalogUrl({ category_id: d.id })}
                  className="flex h-20 items-center justify-center rounded-md bg-muted font-medium hover:bg-brand hover:text-brand-foreground"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <ProductRow
          title="New arrivals"
          filters={{ sort: ProductSort.Newest, limit: HOME.rowSize }}
          seeAllUrl={catalogUrl()}
        />
      </div>
    </div>
  )
}
