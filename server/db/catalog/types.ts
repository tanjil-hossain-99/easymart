import type { AttributeType } from "../../constants.js";

// A number filter range, e.g. screen size { min: 44, max: 53 } = "44 to 52.9 in".
// min is inclusive, max is exclusive; either may be missing ("Up to …", "… & Above").
export type Bucket = { min?: number; max?: number };

type BaseAttribute = {
  key: string; // stored in products.attributes, e.g. "screen_size"
  label: string; // sidebar heading, e.g. "Screen Size"
};

export type AttributeDef =
  | (BaseAttribute & { type: typeof AttributeType.Enum; values: string[] })
  | (BaseAttribute & { type: typeof AttributeType.Number; values: number[]; unit: string; buckets: Bucket[] })
  | (BaseAttribute & { type: typeof AttributeType.Boolean });

export type AttributeValue = string | number | boolean;
export type Attributes = Record<string, AttributeValue>;

export type ImageSource = {
  categories: string[]; // e.g. ["mens-shoes", "womens-shoes"]
  titleMatch?: RegExp; // e.g. /airpods|earphones/i to pick only headphones from "mobile-accessories"
};

// Everything the seed needs to generate realistic products of one type (= one subcategory)
export type ProductTypeDef = {
  name: string; // subcategory name, e.g. "Televisions"
  // Where real product photos come from (DummyJSON categories, optionally narrowed by
  // product title). Missing → a labelled placeholder, never an unrelated random photo.
  images?: ImageSource;
  brands: string[];
  models?: Record<string, string[]>; // real model lines per brand, e.g. Apple → iPhone 16 Pro
  // Brand-specific value lists that replace an attribute's defaults, so the generator
  // doesn't invent impossible products (e.g. only Apple laptops get "Apple M4")
  brandValues?: Record<string, Partial<Record<string, AttributeValue[]>>>;
  priceRange: [min: number, max: number];
  // Multiplies the random base price, e.g. bigger screens cost more
  priceFactor?: (attributes: Attributes) => number;
  attributes: AttributeDef[];
  title: (product: { brand: string; model?: string; attributes: Attributes }) => string;
};

export type DepartmentDef = {
  name: string;
  productTypes: ProductTypeDef[];
};
