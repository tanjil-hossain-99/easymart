import { algoliasearch } from "algoliasearch";
import { env } from "./env.js";

// Two clients, least privilege:
// - searchClient uses the read-only key — the API route can never modify the index,
//   even if there's a bug in it
// - adminClient can write/delete — only the indexing script uses it
export const searchClient = algoliasearch(env.algoliaAppId, env.algoliaSearchKey);
export const adminClient = algoliasearch(env.algoliaAppId, env.algoliaAdminKey);
