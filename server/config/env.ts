import "dotenv/config";

// Read a required env var once at startup. Crashing here with a clear message is much
// better than an "undefined" silently breaking a DB connection or JWT signature later.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see server/.env)`);
  }
  return value;
}

const DEFAULT_PORT = 3000;

export const env = {
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  stripeSecretKey: required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  algoliaAppId: required("ALGOLIA_APP_ID"),
  algoliaSearchKey: required("ALGOLIA_SEARCH_KEY"), // read-only: used by GET /search
  algoliaAdminKey: required("ALGOLIA_ADMIN_KEY"), // can write/delete: only used for indexing
} as const;
