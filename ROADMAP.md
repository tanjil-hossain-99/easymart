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

---

## Phase 3 — Core Product APIs + Indexes 🔄 In Progress
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
- [ ] Compare `OFFSET` pagination on page 1 vs page 4000 — measure the difference
- [ ] Implement cursor-based (keyset) pagination — measure again
- [ ] Fix the N+1 problem: product list should not fire one query per product

**Phase 3 done when:** product list with filters runs under 50ms, you can read an `EXPLAIN` output.

---

## Phase 4 — Auth (Sessions vs JWT)
> Understand the trade-offs before picking one.

- [ ] Research: sessions vs JWT — write your conclusion in `NOTES.md`
- [ ] `POST /auth/register` — hash password with `bcrypt`, store hash (never plain text)
- [ ] `POST /auth/login` — verify password, issue JWT (access token + refresh token)
- [ ] `POST /auth/refresh` — exchange refresh token for new access token
- [ ] `POST /auth/logout`
- [ ] Auth middleware — protect routes that require login
- [ ] Rate limit `/auth/login` — max 5 attempts per IP per minute (implement manually first, then library)
- [ ] Google OAuth (`passport.js` or `arctic` library)

**Phase 4 done when:** protected routes reject unauthenticated requests, login is rate-limited.

---

## Phase 5 — Cart & Checkout (Race Conditions) ⭐
> This is the most important backend phase. Take the most time here.

- [ ] `GET /cart` — fetch current user's cart
- [ ] `POST /cart/items` — add item to cart
- [ ] `PATCH /cart/items/:id` — update quantity
- [ ] `DELETE /cart/items/:id` — remove item

**Checkout — do this in stages:**

- [ ] Stage 1 (naive): check stock → create order → decrement stock. No transaction.
- [ ] Break it: write a script firing 200 concurrent checkout requests for a product with stock=10
- [ ] Observe: how many orders were created? What is final stock?
- [ ] Stage 2: wrap in a `BEGIN` / `COMMIT` transaction — does it fix it?
- [ ] Stage 3: atomic update — `UPDATE inventory SET quantity = quantity - 1 WHERE quantity >= 1`
- [ ] Stage 4: `SELECT ... FOR UPDATE` (pessimistic lock) — implement and test
- [ ] Stage 5: optimistic locking with a `version` column — implement and test
- [ ] Compare all three approaches in `NOTES.md` (trade-offs, performance)
- [ ] Add idempotency key to checkout — same request twice must not create two orders
- [ ] Handle deadlocks: what happens when two users buy products A+B in opposite order?

**Phase 5 done when:** 200 concurrent buyers of 10-unit stock = exactly 10 orders, 0 stock, every time.

---

## Phase 6 — Payments (Stripe)
> Real payment flows are more complex than a tutorial shows.

- [ ] Create Stripe account, get test API keys
- [ ] `POST /payments/create-intent` — create a Stripe PaymentIntent, return `client_secret`
- [ ] Handle Stripe webhooks `POST /webhooks/stripe`:
  - `payment_intent.succeeded` → mark order as paid, confirm stock deduction
  - `payment_intent.payment_failed` → cancel order, release stock
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

## Phase 8 — Search (Algolia)
> Full-text search is a separate concern from your database.

- [ ] Create an Algolia account (free tier: 10k records, 10k searches/month — enough for dev)
- [ ] Create a `products` index in the Algolia dashboard
- [ ] Write a one-time script to push all 50k products to Algolia
- [ ] `GET /search?q=...` — search endpoint that queries Algolia and returns results
- [ ] Sync: when a product is created/updated in Postgres, push the update to Algolia too
- [ ] Add filters on search: category, price range, discount (Algolia facets)
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

## Phase 11 — Admin & Remaining Pages
> Only after backend is solid, wire up the frontend.

**Backend:**
- [ ] `POST /products` — create product (admin only)
- [ ] `PUT /products/:id` — update product (admin only)
- [ ] `DELETE /products/:id` — soft delete
- [ ] `GET /admin/users` — list users with search
- [ ] `GET /users/:id/orders` — purchase history

**Frontend (minimal UI, just functional):**
- [x] Product list page — grid with filters (category, price, sort, discount)
- [x] Product detail page — images, variants, stock, merchant info
- [ ] Homepage — featured products, categories
- [ ] `/cart` — cart page
- [ ] `/checkout` — order placement with Stripe Elements
- [ ] `/orders/:id` — order status + invoice download
- [ ] `/orders` — purchase history
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

## Progress Summary

| Phase | Topic | Status |
|-------|-------|--------|
| 0 | Foundation | ✅ Done |
| 1 | Schema Design | ✅ Done |
| 2 | Seed Data | ✅ Done |
| 3 | Product APIs + Indexes | 🔄 In Progress |
| 4 | Auth | 🔲 Not started |
| 5 | Cart & Race Conditions | 🔲 Not started |
| 6 | Stripe Payments | 🔲 Not started |
| 7 | Redis Caching | 🔲 Not started |
| 8 | Algolia Search | 🔲 Not started |
| 9 | Background Jobs | 🔲 Not started |
| 10 | Invoice PDF | 🔲 Not started |
| 11 | Admin + Frontend | 🔲 Not started |
| 12 | Performance | 🔲 Not started |
