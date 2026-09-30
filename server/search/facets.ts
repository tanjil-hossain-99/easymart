import { ALGOLIA, AttributeType, FACET_PARAM } from "../constants.js";
import type { Bucket } from "../db/catalog/types.js";
import pool from "../db/pool.js";
import type { FacetGroup, FacetOption } from "../types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttributeDefinition = {
  key: string;
  label: string;
  type: AttributeType;
  unit: string | null;
  buckets: Bucket[] | null;
};

// One active filter group from the URL, e.g. brand = [LG, Sony]
export type FacetSelection = {
  param: string; // "brand" / "a.screen_size"
  facet: string; // Algolia attribute: "brand" / "attributes.screen_size"
  type: AttributeType;
  values: string[];
};

type FacetCounts = Record<string, Record<string, number>>; // facet → value → count

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_LABEL = "Brand";
const ATTRIBUTE_KEY_PATTERN = /^[a-z_]+$/; // keys go into filter strings — whitelist the shape
const NUMERIC_BOUND = 1_000_000_000; // stands in for "no lower/upper limit" in a range filter
const EXCLUSIVE_EPSILON = 0.0001; // bucket max is exclusive: "45-56" means 45 ≤ x < 56
const BOOLEAN_TRUE = "true";

// ─── Attribute definitions (Postgres) ─────────────────────────────────────────

// key → type for every attribute any category uses (to parse filters from the URL)
export async function loadAttributeTypes(): Promise<Map<string, AttributeType>> {
  const result = await pool.query<{ key: string; type: AttributeType }>(
    `SELECT DISTINCT ON (key) key, type FROM category_attributes`,
  );
  return new Map(result.rows.map((row) => [row.key, row.type]));
}

// The filters one category shows, in sidebar order
export async function loadCategoryAttributes(categoryId: string): Promise<AttributeDefinition[]> {
  const result = await pool.query<AttributeDefinition>(
    `SELECT key, label, type, unit, buckets FROM category_attributes WHERE category_id = $1 ORDER BY position`,
    [categoryId],
  );
  return result.rows;
}

// ─── URL → selections ─────────────────────────────────────────────────────────

// Express gives a string for ?x=1 and an array for ?x=1&x=2
function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return typeof value === "string" && value ? [value] : [];
}

export function parseSelections(
  query: Record<string, unknown>,
  attributeTypes: Map<string, AttributeType>,
): FacetSelection[] {
  const selections: FacetSelection[] = [];

  const brands = toArray(query[FACET_PARAM.brand]);
  if (brands.length > 0) {
    selections.push({ param: FACET_PARAM.brand, facet: "brand", type: AttributeType.Enum, values: brands });
  }

  for (const [param, raw] of Object.entries(query)) {
    if (!param.startsWith(FACET_PARAM.attributePrefix)) continue;
    const key = param.slice(FACET_PARAM.attributePrefix.length);
    const type = attributeTypes.get(key);
    // Unknown keys are ignored, never pasted into the filter string
    if (!type || !ATTRIBUTE_KEY_PATTERN.test(key)) continue;

    const values = toArray(raw);
    if (values.length > 0) {
      selections.push({ param, facet: `${ALGOLIA.attributeFacetPrefix}${key}`, type, values });
    }
  }
  return selections;
}

// ─── Selections → Algolia filter string ───────────────────────────────────────

// Algolia string values are quoted; escape quotes/backslashes so a value like 27.5" can't break out
const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export const rangeParam = (bucket: Bucket) => `${bucket.min ?? ""}${FACET_PARAM.rangeSeparator}${bucket.max ?? ""}`;

function parseRange(value: string): Bucket | null {
  const [minText, maxText] = value.split(FACET_PARAM.rangeSeparator);
  const min = minText ? Number(minText) : undefined;
  const max = maxText ? Number(maxText) : undefined;
  if ((min !== undefined && !Number.isFinite(min)) || (max !== undefined && !Number.isFinite(max))) return null;
  return { min, max };
}

// Within a group: OR (LG or Sony). The caller ANDs groups together.
export function selectionToFilter(selection: FacetSelection): string | null {
  const { facet, type, values } = selection;

  if (type === AttributeType.Boolean) {
    return values.includes(BOOLEAN_TRUE) ? `${facet}:${BOOLEAN_TRUE}` : null;
  }

  if (type === AttributeType.Number) {
    // Range syntax "x:min TO max" (not ">=/<") because Algolia can OR ranges but not OR of ANDs
    const ranges = values
      .map(parseRange)
      .filter((range) => range !== null)
      .map(({ min, max }) => {
        const low = min ?? -NUMERIC_BOUND;
        const high = max !== undefined ? max - EXCLUSIVE_EPSILON : NUMERIC_BOUND;
        return `${facet}:${low} TO ${high}`;
      });
    return ranges.length > 0 ? `(${ranges.join(" OR ")})` : null;
  }

  return `(${values.map((value) => `${facet}:${quote(value)}`).join(" OR ")})`;
}

// ─── Which category's filters to show ─────────────────────────────────────────

// "tv" → almost all results are Televisions → show TV filters.
// "black" → phones, shirts, mice… → no single category → only the universal filters.
export function pickDominantCategory(categoryCounts: Record<string, number> | undefined, total: number): string | null {
  if (!categoryCounts || total === 0) return null;
  const [topId, topCount] = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] ?? [];
  return topId && topCount / total >= ALGOLIA.dominantCategoryMinShare ? topId : null;
}

// ─── Algolia counts → sidebar groups ──────────────────────────────────────────

function rangeLabel({ min, max }: Bucket, unit: string | null): string {
  const u = unit ? ` ${unit}` : "";
  if (min === undefined) return `Up to ${max}${u}`;
  if (max === undefined) return `${min}${u} & above`;
  return `${min} to ${max}${u}`;
}

const byCountDesc = (a: FacetOption, b: FacetOption) => b.count - a.count;

// Options for a list-type group; selected values always stay visible, even at count 0
function listOptions(counts: Record<string, number>, selected: string[]): FacetOption[] {
  const values = new Set([...Object.keys(counts), ...selected]);
  return [...values]
    .map((value) => ({ value, label: value, count: counts[value] ?? 0, selected: selected.includes(value) }))
    .sort(byCountDesc);
}

type BuildGroupsInput = {
  // Counts per facet. For groups with an active selection, these come from a query that
  // ignores that group's own filter ("disjunctive faceting"), so after picking LG the
  // other brands still show real counts instead of 0.
  counts: FacetCounts;
  definitions: AttributeDefinition[];
  selections: FacetSelection[];
};

export function buildFacetGroups({ counts, definitions, selections }: BuildGroupsInput): FacetGroup[] {
  const selectedValues = (param: string) => selections.find((s) => s.param === param)?.values ?? [];
  const groups: FacetGroup[] = [];

  groups.push({
    param: FACET_PARAM.brand,
    label: BRAND_LABEL,
    type: AttributeType.Enum,
    options: listOptions(counts.brand ?? {}, selectedValues(FACET_PARAM.brand)),
  });

  for (const def of definitions) {
    const param = `${FACET_PARAM.attributePrefix}${def.key}`;
    const facetCounts = counts[`${ALGOLIA.attributeFacetPrefix}${def.key}`] ?? {};
    const selected = selectedValues(param);
    let options: FacetOption[];

    if (def.type === AttributeType.Boolean) {
      // One checkbox: "Active Noise Cancelling (120)"
      options = [{ value: BOOLEAN_TRUE, label: def.label, count: facetCounts[BOOLEAN_TRUE] ?? 0, selected: selected.includes(BOOLEAN_TRUE) }];
    } else if (def.type === AttributeType.Number) {
      // Algolia counts each exact value (43: 30, 55: 41…) — add them up per range
      options = (def.buckets ?? []).map((bucket) => {
        const value = rangeParam(bucket);
        const count = Object.entries(facetCounts)
          .filter(([v]) => {
            const n = Number(v);
            return (bucket.min === undefined || n >= bucket.min) && (bucket.max === undefined || n < bucket.max);
          })
          .reduce((sum, [, c]) => sum + c, 0);
        return { value, label: rangeLabel(bucket, def.unit), count, selected: selected.includes(value) };
      }); // ranges keep their natural order (small → large), not sorted by count
    } else {
      options = listOptions(facetCounts, selected);
    }

    // Hide options nobody can pick (count 0) unless they're currently selected
    options = options.filter((o) => o.count > 0 || o.selected);
    if (options.length > 0) groups.push({ param, label: def.label, type: def.type, options });
  }

  return groups.filter((g) => g.options.length > 0);
}
