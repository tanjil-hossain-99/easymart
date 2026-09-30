# EasyMart — Setting Up on a New Machine

Everything in the repo comes with `git clone`. Three things don't, on purpose:

| Not in git | Why | How you get it on the new machine |
|---|---|---|
| `server/.env`, `client/.env` | They hold API keys and secrets | Create them from the `.env.example` files (step 4) |
| Database data | Postgres runs on each machine | `yarn migrate` + `yarn seed` (step 6), or a shared Neon DB (see the end) |
| `node_modules` | Installed from the lockfile | `yarn` (step 2) |

---

## 1. Install the tools

| Tool | Version | Notes |
|---|---|---|
| Node.js | **22+** | `node -v` |
| Yarn | 1.x | `npm i -g yarn` |
| PostgreSQL | **15 or newer** | Required: migration `016` uses `NULLS NOT DISTINCT` (Postgres 15+) |
| Stripe CLI | latest | macOS: `brew install stripe/stripe-cli/stripe` · Windows: see stripe.com/docs/stripe-cli |

## 2. Clone and install

```bash
git clone https://github.com/tanjil-hossain-99/easymart.git
cd easymart

cd server && yarn
cd ../client && yarn
```

## 3. Create the database

```bash
createdb easymart
```

## 4. Create the `.env` files

Copy the templates, then fill in the values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**

```bash
DATABASE_URL=postgresql://<your-os-username>@localhost:5432/easymart
JWT_SECRET=<any long random string: openssl rand -hex 32>
STRIPE_SECRET_KEY=sk_test_...        # Stripe dashboard → EasyMart sandbox → Developers → API keys
STRIPE_WEBHOOK_SECRET=whsec_...      # from step 5 — it's different on every machine
ALGOLIA_APP_ID=...                   # Algolia dashboard → Settings → API Keys
ALGOLIA_SEARCH_KEY=...               # "Search-Only API Key"
ALGOLIA_ADMIN_KEY=...                # "Admin API Key" — never goes in the client
```

**`client/.env`**

```bash
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...   # same dashboard page as the secret key
```

> ⚠️ Copy keys from the dashboards (or a password manager) — never commit `.env` files or paste keys into chat.
> ⚠️ Put each variable on its own line and end the file with a newline — a missing newline once glued two keys together.

## 5. Connect the Stripe CLI (for webhooks)

Stripe can't reach `localhost` on its own; the CLI forwards payment events to your machine.

```bash
stripe login                    # opens the browser → choose "EasyMart sandbox"
stripe listen --print-secret    # prints whsec_... → put it in STRIPE_WEBHOOK_SECRET
```

## 6. Fill the database and the search index

```bash
cd server
yarn migrate          # creates all tables
yarn seed             # ~5 s locally: 50k products, test users, orders
yarn algolia:sync     # ~2 min: rebuilds the search index from this database
```

## 7. Run the app (3 terminals)

```bash
# terminal 1 — API on http://localhost:3000 (restarts on file changes)
cd server && yarn server

# terminal 2 — forwards Stripe payment events to the API
cd server && yarn stripe:listen

# terminal 3 — website on http://localhost:5173
cd client && yarn dev
```

## 8. Log in and check

| Account | Password | Role |
|---|---|---|
| `customer@example.com` | `password123` | customer |
| `test@example.com` | `password123` | admin |

Quick checks:
- `http://localhost:3000/health` → `{"db":"ok",…}`
- Search "tv" → results and a TV-specific filter sidebar
- Checkout with card `4242 4242 4242 4242` → order becomes "paid", and terminal 2 shows `payment_intent.succeeded [200]`

---

## ⚠️ Switching between machines (home ↔ office)

Each machine has **its own database**, but the **Algolia search index is shared** (it's in the cloud).
`yarn seed` creates new product ids every time, so after seeding/syncing on one machine, search
results on the other machine point at products it doesn't have ("Sorry, we couldn't find that product").

**Fix:** after switching machines, run once:

```bash
cd server && yarn algolia:sync
```

**Permanent fix:** use one shared hosted database (below).

---

## Option: shared Neon database (same data on every machine)

1. Sign up at [neon.tech](https://neon.tech) → create a project (region **AWS Singapore**, Postgres **17**).
2. Copy the **pooled** connection string (host contains `-pooler`, ends with `?sslmode=require`).
3. On **every** machine, set it as `DATABASE_URL` in `server/.env` (skip step 3 `createdb`).
4. From **one** machine only: `yarn migrate && yarn seed && yarn algolia:sync`.

Trade-offs: queries take ~40–80 ms over the internet (vs ~1 ms locally), the free tier sleeps after
5 minutes idle (first request ~1 s), and you need internet. For Phase 3 performance exercises, keep a
local database and switch `DATABASE_URL` back.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Missing required environment variable: …` on startup | `.env` missing or incomplete | Step 4 |
| `database "<your-username>" does not exist` | `DATABASE_URL` not set, so Postgres falls back to your username | Step 4 |
| Migration `016` fails near `NULLS` | Postgres older than 15 | Upgrade Postgres |
| After paying, the order stays "Confirming your payment…" | Webhooks aren't reaching the API | Terminal 2 running? If it says "expired OAuth token", run `stripe login` again |
| Webhook shows `[400]` in terminal 2 | `STRIPE_WEBHOOK_SECRET` is from another machine | Re-run `stripe listen --print-secret`, update `.env`, restart the API |
| Search results open "couldn't find that product" | Search index was built from another machine's database | `yarn algolia:sync` |
| Cart/orders error right after a reseed | The browser is still logged in as a user the reseed deleted | Sign out, log in again |
| Search shows nothing for a while | `algolia:sync` clears the index first (~2 min rebuild) | Wait for "✅ Indexed …" |

## Useful scripts (`server/`)

| Command | What it does |
|---|---|
| `yarn server` | API with auto-restart |
| `yarn migrate` | Run all SQL migrations (safe to re-run) |
| `yarn seed` | **Wipes** the database and fills it with the realistic catalog |
| `yarn algolia:sync` | Rebuild the search index from the database |
| `yarn stripe:listen` | Forward Stripe webhooks to `localhost:3000` |
| `yarn catalog:images` | Re-fetch the product photo list (rarely needed — `images.json` is committed) |
| `npx tsx db/make-admin.ts <email>` | Promote a user to admin |
