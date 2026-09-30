# EasyMart — Project Roadmap

> **Goal:** Learn backend engineering deeply (race conditions, caching, search, payments, queues)
> through a real ecommerce project. UI is intentionally minimal.
>
> **Stack:** React · Express (TypeScript) · PostgreSQL · Redis · Stripe · Algolia · Google OAuth

---

## How to use this file

- Check off items as you complete them `[x]`
- After each phase, write a short note in `NOTES.md` on what broke and what fixed it
- Don't move to the next phase until the current one is solid

> **Build-order change (Sep 30, 2026):** the performance/learning work in Phase 3 is paused.
> We built the **full customer flow first** (auth → cart → Stripe checkout → orders → Algolia search)
> in a simple, un-optimized form, plus an Amazon-style storefront. The naive spots are listed in
> **Known naive spots** below — they are exactly what Phases 5–7 and 12 are for.

---

## Phase 0 — Foundation ✅
> Set up the project skeleton. Nothing fancy, just things that must exist before anything else.

- [x] `git init` at root, push to GitHub
- [x] Create `.env` files for server (never commit these)
- [x] Install and start PostgreSQL locally (`brew install postgresql@17`)
- [x] Create `easymart` database in psql
- [x] Connect Express to Postgres using `pg` (node-postgres — no ORM yet)
- [x] Health check endpoint `GET /health` that queries the DB and returns status
- [x] Centralized error handler middleware in Express
- [x] Request logger middleware (log method, path, status, duration)
- [x] `server/db/` folder for all database logic
- [x] `server/db/migrate.ts` — a script that runs SQL files in order to create tables
- [x] `server/db/seed.ts` — a script to insert dummy data

**Phase 0 done when:** `GET /health` returns `{ db: "ok" }` and you can see the log line in terminal.

---

## Phase 1 — Schema Design ✅
> Design on paper first. Every mistake here costs you later.

- [x] Draw the full schema on paper before writing SQL
- [x] Write `CREATE TABLE` SQL for:
  - `users` (id, email, password_hash, google_id, avatar_url, role, created_at)
  - `merchants` (id, name, url, details, logo_url, image_url)
  - `categories` (id, name, slug, parent_id)
  - `products` (id, title, description, price, discount, merchant_id, category_id, stripe_product_id, stripe_price_id, is_active, created_at)
  - `product_images` (id, product_id, url, is_primary)
  - `product_variants` (id, product_id, type, value, price_modifier)
  - `inventory` (id, product_id, variant_id, quantity, version)
  - `carts` (id, user_id, created_at)
  - `cart_items` (id, cart_id, product_id, variant_id, quantity)
  - `orders` (id, user_id, status, total_amount, stripe_payment_intent_id, idempotency_key, created_at)
  - `order_items` (id, order_id, product_id, variant_id, quantity, price_at_purchase)
  - `saved_products` (id, user_id, product_id)
  - `payments` (id, order_id, stripe_payment_intent_id, amount, currency, status)
  - `invoices` (id, order_id, file_path, created_at)
- [x] Run migrations and verify tables exist in psql (`\dt` shows 14 tables)
- [x] Added `CHECK (discount >= 0 AND discount <= 100)` constraint on products

**Key decisions understood:**
- `price_at_purchase` on `order_items` — snapshot, not a reference
- `inventory` is separate from `products` — supports per-variant stock
- `parent_id` on `categories` — adjacency list for subcategory tree
- `version` on `inventory` — reserved for optimistic locking in Phase 5
- `idempotency_key` on `orders` — prevents duplicate orders
- `NUMERIC` not `FLOAT` for all money columns

---

## Phase 2 — Seed Data ✅
> Inserting data is not trivial at scale. You'll learn why.

- [x] Write a seed script using `@faker-js/faker` that generates:
  - 500 users
  - 20 merchants
  - 50 categories (10 top-level + 40 subcategories)
  - **50,000 products** with images and inventory
  - ~2,647 past orders with order items
- [x] Used `insertMany` batch pattern — chunks of 1000 rows per query
- [x] Seed completes in **2.1 seconds** for 50k products
- [x] Verified counts: 50,000 products · 50,000 inventory rows · 2,647 orders
- [x] Ran `EXPLAIN ANALYZE` — observed `Seq Scan` with no indexes
- [x] Replaced Faker names with a **realistic catalog** — see *Realistic Catalog* below
      (numbers above are from the original Faker seed)

---

## Phase 3 — Core Product APIs + Indexes ⏸️ Paused (APIs done, perf exercises pending)
> Most of the backend learning starts here.

- [x] `GET /products` — list with filters (category, price range, discount), sorting, pagination
- [x] `GET /products/:id` — single product with variants, images, merchant and inventory
- [x] `GET /categories` — full category list (flat, tree built on frontend)
- [x] Added indexes and measured before/after with `EXPLAIN ANALYZE`:
  - `idx_products_price` on `products(price)` → **10.9ms → 3.6ms**
  - `idx_products_category` on `products(category_id)` → **~10ms → 0.38ms**
  - `idx_products_category_price` composite on `(category_id, price)` → **0.71ms** for combined filter
- [x] Understood `Seq Scan` vs `Bitmap Heap Scan` vs `Index Scan`
- [x] Understood composite index column order — left-most column rule
- [x] Built minimal frontend UI — product grid, filters, detail page (React Query)
- [x] Indexes moved into a migration (`015_product_indexes.sql`) — they were created by hand
      in psql, so a fresh machine didn't have them
- [x] Price filters/sort use the **price after discount** (`FINAL_PRICE_SQL`); department filter
      includes subcategories — *trade-off: `idx_products_price` can't serve an expression → try an
      expression index here*
- [x] Measured OFFSET baseline (before indexes on `created_at`, 50k rows):
      page 1 ≈ **60 ms** (Seq Scan + top-N heapsort) · `OFFSET 49980` ≈ **74 ms**
      (Seq Scan + external merge sort, 3.2 MB spilled to disk). Note: 50k rows = 2,500 pages, "page 4000" doesn't exist
- [ ] Add `(created_at, id)` index, re-measure page 1 vs last page
- [ ] Compare `OFFSET` pagination on page 1 vs page 4000 — measure the difference
- [ ] Implement cursor-based (keyset) pagination — measure again
- [ ] Fix the N+1 problem: product list should not fire one query per product
      *(list already uses a JOIN for the primary image — the real issue found: `product_images.product_id`
      and other foreign keys have **no index**; Postgres doesn't index FKs automatically)*

**Phase 3 done when:** product list with filters runs under 50ms, you can read an `EXPLAIN` output.

---

## Phase 4 — Auth (Sessions vs JWT) 🔄 Basic version done
> Understand the trade-offs before picking one.

- [ ] Research: sessions vs JWT — write your conclusion in `NOTES.md`
- [x] `POST /auth/register` — hash password with `bcryptjs` (cost 10), store hash; role never taken from the request
- [x] `POST /auth/login` — verify password, issue JWT *(access token only, 7-day expiry — no refresh token yet)*
- [x] `GET /auth/me` — current user
- [ ] `POST /auth/refresh` — exchange refresh token for new access token
- [ ] `POST /auth/logout` *(today logout only drops the token in the browser)*
- [x] Auth middleware — `requireAuth` (401) + `requireAdmin` (403); `/admin/*` protected as a whole
- [x] First admin via script: `npx tsx db/make-admin.ts <email>`
- [ ] Fix: role lives inside the JWT → a demoted admin keeps admin rights until the token expires
- [ ] Rate limit `/auth/login` — max 5 attempts per IP per minute (implement manually first, then library)
- [ ] Google OAuth (`passport.js` or `arctic` library)

**Phase 4 done when:** protected routes reject unauthenticated requests, login is rate-limited.

---

## Phase 5 — Cart & Checkout (Race Conditions) ⭐ 🔄 Cart + naive checkout done
> This is the most important backend phase. Take the most time here.

- [x] `GET /cart` — fetch current user's cart (prices calculated live, subtotal in SQL)
- [x] `POST /cart/items` — add item to cart (atomic upsert: adding again increases quantity)
- [x] `PATCH /cart/items/:id` — update quantity (ownership check in SQL → no IDOR)
- [x] `DELETE /cart/items/:id` — remove item
- [x] Migration 016: `UNIQUE NULLS NOT DISTINCT` on cart_items — NULL variant_id made the old constraint useless

**Checkout — do this in stages:**

- [x] Stage 1 (naive): `POST /checkout` checks stock → creates order + items in a transaction →
      stock is decremented later by the Stripe webhook. **No locking** — concurrent buyers can oversell.
- [ ] Break it: write a script firing 200 concurrent checkout requests for a product with stock=10
- [ ] Observe: how many orders were created? What is final stock?
- [ ] Stage 2: wrap in a `BEGIN` / `COMMIT` transaction — does it fix it?
- [ ] Stage 3: atomic update — `UPDATE inventory SET quantity = quantity - 1 WHERE quantity >= 1`
- [ ] Stage 4: `SELECT ... FOR UPDATE` (pessimistic lock) — implement and test
- [ ] Stage 5: optimistic locking with a `version` column — implement and test
- [ ] Compare all three approaches in `NOTES.md` (trade-offs, performance)
- [ ] Add idempotency key to checkout — same request twice must not create two orders
      *(today: every Checkout click creates a new pending order; only the Stripe call has an idempotency key)*
- [ ] Handle deadlocks: what happens when two users buy products A+B in opposite order?

**Phase 5 done when:** 200 concurrent buyers of 10-unit stock = exactly 10 orders, 0 stock, every time.

---

## Phase 6 — Payments (Stripe) 🔄 Happy path done
> Real payment flows are more complex than a tutorial shows.

- [x] Create Stripe account, get test API keys (sandbox "EasyMart sandbox")
- [x] `POST /checkout` creates the PaymentIntent (amount in cents, `metadata.order_id`,
      idempotency key `order-<id>`) and returns `client_secret`; `GET /orders/:id` re-fetches it after a refresh
- [x] Frontend: Stripe Payment Element on `/checkout/:orderId`, confirmation page polls until paid
- [x] Handle Stripe webhooks `POST /webhooks/stripe` (raw body + signature check, mounted before `express.json()`):
  - [x] `payment_intent.succeeded` → order `paid`, payment `succeeded`, stock decremented, bought items
        removed from cart — one transaction, **idempotent** (`WHERE status = 'pending'`)
  - [x] `payment_intent.payment_failed` → payment row `failed`; order stays `pending` so the customer can
        retry with another card *(differs from the plan: nothing to release yet, stock isn't reserved)*
- [x] Local webhooks: `yarn stripe:listen` (Stripe CLI; re-run `stripe login` when the token expires)
- [ ] Decide: keep PaymentIntents or move to Checkout Sessions (Stripe's current recommendation)
- [ ] Stock reservation: hold stock for 10 minutes during checkout, release if unpaid
- [ ] Write a cleanup job (plain `setInterval` first) to release expired reservations
- [ ] Model order as a state machine: `pending → paid → shipped / cancelled`
- [ ] Enforce valid transitions (you cannot go from `cancelled` back to `paid`)

**Think about:** what if the webhook arrives after the reservation expired?

**Phase 6 done when:** test payment succeeds/fails correctly, stock is never lost or double-counted.

---

## Phase 7 — Redis Caching
> Measure before and after — the numbers tell the story.

- [ ] Install Redis locally (`brew install redis`)
- [ ] Connect to Redis in Express using `ioredis`
- [ ] Cache `GET /products/:id` with a TTL of 5 minutes (cache-aside pattern)
- [ ] Cache category tree (changes rarely)
- [ ] Invalidate product cache when product is updated
- [ ] Benchmark with `autocannon`: requests/sec before vs after caching
- [ ] Understand cache stampede — what happens when cache expires and 1000 requests hit at once?
- [ ] Implement a simple mutex lock in Redis to prevent stampede
- [ ] Move rate limiter counters from in-memory to Redis

**Phase 7 done when:** cached endpoints are measurably faster, you can explain invalidation strategy.

---

## Phase 8 — Search (Algolia) 🔄 Search + autocomplete done
> Full-text search is a separate concern from your database.

- [x] Create an Algolia account (free tier: 10k records, 10k searches/month — enough for dev)
- [x] `products` index created and configured by the sync script (searchable attributes, ranking)
- [x] `yarn algolia:sync` — clears the index, then pushes a **fair share per category** (≈434 × 23 = 10k);
      "newest 10k" had left whole product types out of search
- [x] `GET /search?q=...` — same filters + response shape as `/products`; read-only search key, admin key only for indexing
- [x] `GET /search/suggestions` — Amazon-style autocomplete built from product names (no search analytics yet)
- [ ] Sync: when a product is created/updated in Postgres, push the update to Algolia too
- [x] Add filters on search: category (incl. subcategories), price range on final price, discount *(as filters)*
- [x] Real **facets** with counts + dynamic per-category filters — see *Realistic Catalog* steps 3–4
- [ ] Price sorting inside search (needs Algolia replica indexes)
- [ ] Understand why `ILIKE '%keyword%'` in Postgres doesn't scale for full-text search
- [ ] Understand: Algolia is a separate service — what happens if Algolia is down but your DB is up?

**Phase 8 done when:** search returns relevant results in under 100ms on 50k products, filters work.

---

## Phase 9 — Background Jobs & Queues
> Don't make the user wait for slow work.

- [ ] Install BullMQ (backed by Redis)
- [ ] Move these out of the request lifecycle into a queue:
  - Order confirmation email (just `console.log` for now)
  - Invoice PDF generation
  - Search index sync after product update
- [ ] Add retry logic with exponential backoff
- [ ] Handle failed jobs (dead letter queue)
- [ ] Make all jobs idempotent (safe to run twice)
- [ ] Graceful shutdown: drain queue before `process.exit`

**Phase 9 done when:** checkout response is instant, work happens in the background.

---

## Phase 10 — Invoice PDF Generation
> A practical requirement that touches file storage.

- [ ] Generate a PDF invoice after order is paid (use `pdfkit` or `@react-pdf/renderer`)
- [ ] Store PDF locally in `/invoices` folder (or S3-compatible store later)
- [ ] `GET /orders/:id/invoice` — stream the PDF file to the client
- [ ] Trigger generation via BullMQ job from Phase 9

---

## Phase 11 — Admin & Remaining Pages 🔄 Customer pages done, admin not started
> Only after backend is solid, wire up the frontend.

**Backend:**
- [ ] `POST /products` — create product (admin only)
- [ ] `PUT /products/:id` — update product (admin only)
- [ ] `DELETE /products/:id` — soft delete
- [ ] `GET /admin/users` — list users with search
- [x] Purchase history — built as `GET /orders` (own orders) + `GET /orders/:id` (with ownership check)

**Frontend (minimal UI, just functional):**
- [x] Product list page — now the Amazon-style results page `/s` (see *Storefront UX*)
- [x] Product detail page — gallery, price box, buy box with quantity + Buy Now, breadcrumb
- [x] Homepage — hero, today's deals, departments, new arrivals
- [x] `/cart` — cart page
- [x] `/checkout` — order placement with Stripe Elements
- [x] `/orders/:id` — order status *(invoice download pending Phase 10)*
- [x] `/orders` — purchase history
- [x] `/login`, `/register` — with redirect back to where you were
- [ ] `/saved` — saved/wishlist products
- [ ] `/admin/products` — UPSERT product form
- [ ] `/admin/users` — user search

---

## Phase 12 — Performance & Hardening
> Make it production-worthy.

- [ ] Connection pooling: configure `pg` pool size, understand why it matters under load
- [ ] Slow query log: log any query over 100ms
- [ ] `GET /products` — implement lazy loading / infinite scroll on the frontend
- [ ] Image lazy loading with `loading="lazy"`
- [ ] Compression middleware (`compression` package)
- [ ] Helmet.js for security headers
- [ ] Input validation on all endpoints with `zod`
- [ ] Audit all endpoints for missing auth checks

---

## Stretch Goals (after everything above)
- [ ] Run 3 server instances with Node `cluster` — watch in-memory state break
- [ ] Move session/rate-limit state to Redis — fix it
- [ ] Add Nginx as reverse proxy / load balancer
- [ ] Read replica for heavy read queries
- [ ] Prometheus + Grafana metrics dashboard

---

## Storefront UX (Amazon-style) ✅
> Not in the original plan — added so the customer flow feels like a real store.

- [x] Header: dark top bar, department dropdown + search box, account, returns & orders, cart icon with count *in* the basket
- [x] Category bar: All · Today's Deals · departments
- [x] Autocomplete dropdown: every row is a search (never jumps to a product), thumbnails as hints,
      typed text plain / completion bold, ↑ ↓ Enter Esc, ARIA combobox
- [x] Page dims while the search box is focused (overlay stays while using the department dropdown)
- [x] Search state lives in the URL (`/s?q=…&category_id=…`) — shareable, back button works
- [x] Results page: "1-20 of N results for …", sidebar (department drill-down, price ranges + min/max, discounts),
      list-style result cards with -% badge + list price, numbered pagination
- [x] Homepage and results page are separate (`/` vs `/s`), like amazon.com vs amazon.com/s
- [x] Product page redesign (gallery, info, buy box)
- [x] Not-found handling: catch-all `*` route, friendly page for missing products/orders (404 or malformed id),
      no retries on 4xx, JSON 404 for unknown API paths *(deploy note: static hosts need an SPA rewrite to `index.html`)*

---

## Realistic Catalog + Dynamic Filters 🔄 Steps 1, 3, 4 done — variants (2) pending
> Amazon's sidebar changes per product type (TVs → screen size; T-shirts → fit, sleeve).

- [x] **Step 1 — Realistic catalog**
  - Migration 018: `products.brand`, `products.attributes JSONB`, `category_attributes` (filter definitions per category)
  - `server/db/catalog/`: 7 departments → 23 product types, real brands/models, attributes, price ranges,
    title templates, per-brand rules (`brandValues`)
  - Real product photos from DummyJSON (`yarn catalog:images` → `images.json`), labelled placeholder otherwise
  - `yarn seed` rebuilds everything in ~5 s; test logins `test@example.com` (admin), `customer@example.com` — password `password123`
- [ ] **Step 2 — Variants**: sizes for clothing/shoes, colors for some electronics, stock per variant,
      picker on the product page, required in cart, shown on orders
- [x] **Step 3 — Facets**: `brand` + `attributes.*` indexed and faceted in Algolia; `/search` returns counts
  - Dominant category (≥ 50% of results) decides which filters appear; mixed results → only Brand
  - **Disjunctive faceting** via Algolia multi-search: one extra counts-only query per active group,
    so ticking LG keeps other brands' counts (OR within a group, AND across groups)
  - Number attributes filtered by ranges (`a.screen_size=56-70`, Algolia `x:min TO max`), counts summed per bucket
  - Filter values from the URL are validated/escaped before going into the Algolia filter string
- [x] **Step 4 — Dynamic sidebar**: groups rendered from the response (checkbox lists with counts, "See more",
      yes/no attributes under "Features"); selections live in the URL (`?brand=LG&a.display_type=OLED`)
  - Results page uses Algolia when there's a query, a category or a filter; plain browsing stays on Postgres (keeps sorting)
  - *Known limits: search-engine mode is relevance-only (sorting needs replicas); Algolia holds ~434 products per type (free plan)*

---

## Project Setup & Conventions (added along the way)

- **Env config** validated at startup (`server/config/env.ts`, `client/src/config/env.ts`); `.env.example` in both apps
- **No hard-coded values**: `as const` enums + derived types in `server/constants.ts` and `client/src/lib/constants.ts`
  (TS `enum` isn't allowed — `erasableSyntaxOnly`); typed DB rows via `pool.query<Row>()`
- **Frontend stack**: `fetch` wrapper (`apiFetch`) + TanStack Query for server state + Zustand for auth; react-router v7
- **Scripts (server)**: `yarn migrate`, `yarn seed`, `yarn algolia:sync`, `yarn catalog:images`, `yarn stripe:listen`,
  `npx tsx db/make-admin.ts <email>`
- **New machine setup**: see [`SETUP.md`](SETUP.md) (tools, `.env` files, Stripe CLI, seed + search index, troubleshooting)

---

## Known Naive Spots (on purpose — fix in the matching phase)

| Where | What's naive | Fix in |
|---|---|---|
| Checkout | No locking — two buyers can pass the stock check for the last item | Phase 5 |
| Checkout | Every click creates a new pending order (no idempotency key) | Phase 5 |
| Webhook | If stock ran out after checkout, the stock `CHECK` fails and Stripe retries forever | Phase 5/6 (reservation) |
| Orders | Abandoned `pending` orders are never cleaned up | Phase 6 (cleanup job) |
| Auth | JWT in localStorage (XSS-readable); no refresh token; role baked into token | Phase 4 |
| Search | Algolia only updates on `yarn algolia:sync`; free plan = 10k of 50k products indexed | Phase 8/9 |
| DB | Foreign keys unindexed; price filter on an expression can't use `idx_products_price` | Phase 3 / 12 |
| Seed | Attribute values equally likely (8K TVs as common as 4K) | nice-to-have |

---

## Progress Summary

| Phase | Topic | Status |
|-------|-------|--------|
| 0 | Foundation | ✅ Done |
| 1 | Schema Design | ✅ Done |
| 2 | Seed Data | ✅ Done |
| 3 | Product APIs + Indexes | ⏸️ APIs done, perf exercises paused |
| 4 | Auth | 🔄 Register/login/JWT done — refresh, rate limit, OAuth pending |
| 5 | Cart & Race Conditions | 🔄 Cart + naive checkout done — race-condition stages pending |
| 6 | Stripe Payments | 🔄 Happy path + webhooks done — reservation, cleanup pending |
| 7 | Redis Caching | 🔲 Not started |
| 8 | Algolia Search | 🔄 Search, autocomplete, facets done — live sync, sorting pending |
| 9 | Background Jobs | 🔲 Not started |
| 10 | Invoice PDF | 🔲 Not started |
| 11 | Admin + Frontend | 🔄 Customer pages done — admin pending |
| 12 | Performance | 🔲 Not started |
| — | Storefront UX (Amazon-style) | ✅ Done |
| — | Realistic Catalog + Dynamic Filters | 🔄 Catalog + dynamic filters done — variants pending |
