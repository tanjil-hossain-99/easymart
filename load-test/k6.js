/**
 * EasyMart k6 load test
 *
 * Usage:
 *   k6 run load-test/k6.js                          # smoke test (1 VU, 10s)
 *   k6 run --env SCENARIO=load load-test/k6.js      # load test (ramp to 50 VUs)
 *   k6 run --env SCENARIO=stress load-test/k6.js    # stress test (ramp to 150 VUs)
 *   k6 run --env SCENARIO=spike load-test/k6.js     # sudden spike to 200 VUs
 *
 * To test authenticated endpoints, get a JWT first:
 *   k6 run --env JWT=<your-token> --env SCENARIO=load load-test/k6.js
 *
 * Get a JWT:
 *   curl -s -X POST http://localhost:3000/auth/login \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"customer@example.com","password":"password123"}' | jq -r .token
 */

import http from "k6/http"
import { check, group, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"

// ── Custom metrics ─────────────────────────────────────────────────────────────

const errorRate = new Rate("errors")
const searchLatency = new Trend("search_latency", true)
const suggestionsLatency = new Trend("suggestions_latency", true)
const productsLatency = new Trend("products_latency", true)
const ordersLatency = new Trend("orders_latency", true)

// ── Config ─────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"
const JWT = __ENV.JWT || ""
const SCENARIO = __ENV.SCENARIO || "smoke"

const SCENARIOS = {
  smoke: {
    vus: 1,
    duration: "10s",
  },
  load: {
    stages: [
      { duration: "30s", target: 20 },  // ramp up
      { duration: "1m",  target: 50 },  // hold
      { duration: "20s", target: 0 },   // ramp down
    ],
  },
  stress: {
    stages: [
      { duration: "30s", target: 50  },
      { duration: "1m",  target: 100 },
      { duration: "30s", target: 150 },
      { duration: "30s", target: 0   },
    ],
  },
  spike: {
    stages: [
      { duration: "10s", target: 1   },  // baseline
      { duration: "5s",  target: 200 },  // instant spike
      { duration: "30s", target: 200 },  // hold
      { duration: "10s", target: 1   },  // drop back
    ],
  },
  massive: {
    stages: [
      { duration: "30s", target: 100 },  // ramp to 100
      { duration: "30s", target: 300 },  // ramp to 300
      { duration: "30s", target: 500 },  // ramp to 500
      { duration: "1m",  target: 500 },  // hold at 500
      { duration: "30s", target: 0   },  // ramp down
    ],
  },
}

// ── Thresholds (what counts as a passing test) ─────────────────────────────────

export const options = {
  ...(SCENARIOS[SCENARIO].stages
    ? { stages: SCENARIOS[SCENARIO].stages }
    : { vus: SCENARIOS[SCENARIO].vus, duration: SCENARIOS[SCENARIO].duration }),

  thresholds: {
    // 95% of all requests under 500ms
    http_req_duration: ["p(95)<500"],
    // Search can be slower because it hits Algolia (cloud round-trip)
    search_latency: ["p(95)<1000"],
    suggestions_latency: ["p(95)<600"],
    products_latency: ["p(95)<300"],
    // Error rate under 1%
    errors: ["rate<0.01"],
    // No more than 1% of requests should fail
    http_req_failed: ["rate<0.01"],
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const authHeaders = JWT
  ? { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" }
  : { "Content-Type": "application/json" }

function ok(res, label) {
  const passed = check(res, {
    [`${label}: status 200`]: (r) => r.status === 200,
    [`${label}: has body`]: (r) => r.body && r.body.length > 0,
  })
  errorRate.add(!passed)
  return passed
}

// Sample queries — realistic mix, not all the same keyword
const SEARCH_QUERIES = ["laptop", "phone", "tv", "headphones", "chair", "camera", "keyboard", "monitor"]
const SUGGESTION_QUERIES = ["la", "ph", "tv", "he", "ch", "ca"]

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Scenarios ──────────────────────────────────────────────────────────────────

export default function () {
  // Each VU runs through all groups once per iteration, with small sleeps between

  // 1. Health check (quick sanity)
  group("health", () => {
    const res = http.get(`${BASE_URL}/health`)
    check(res, { "health: ok": (r) => r.status === 200 })
    errorRate.add(res.status !== 200)
  })

  sleep(0.3)

  // 2. Product browsing (pure Postgres)
  group("products", () => {
    const res = http.get(`${BASE_URL}/products?limit=24&page=1`)
    const passed = ok(res, "products list")
    if (passed) productsLatency.add(res.timings.duration)
  })

  sleep(0.3)

  // 3. Search (Algolia round-trip)
  group("search", () => {
    const q = randomItem(SEARCH_QUERIES)
    const res = http.get(`${BASE_URL}/search?q=${q}&limit=24`)
    const passed = ok(res, `search(${q})`)
    if (passed) searchLatency.add(res.timings.duration)
  })

  sleep(0.2)

  // 4. Search suggestions (lightweight Algolia)
  group("suggestions", () => {
    const q = randomItem(SUGGESTION_QUERIES)
    const res = http.get(`${BASE_URL}/search/suggestions?q=${q}`)
    const passed = ok(res, `suggestions(${q})`)
    if (passed) suggestionsLatency.add(res.timings.duration)
  })

  sleep(0.3)

  // 5. Authenticated: orders list (skipped if no JWT)
  if (JWT) {
    group("orders", () => {
      const res = http.get(`${BASE_URL}/orders`, { headers: authHeaders })
      const passed = check(res, {
        "orders: status 200": (r) => r.status === 200,
      })
      errorRate.add(!passed)
      if (passed) ordersLatency.add(res.timings.duration)
    })
    sleep(0.2)
  }

  // 6. Categories (likely cached hot path)
  group("categories", () => {
    const res = http.get(`${BASE_URL}/categories`)
    ok(res, "categories")
  })

  sleep(1) // think time between iterations
}
