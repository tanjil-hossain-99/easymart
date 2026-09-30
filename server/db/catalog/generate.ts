import { faker } from "@faker-js/faker";
import { AttributeType } from "../../constants.js";
import type { AttributeDef, AttributeValue, Attributes, ProductTypeDef } from "./types.js";

export type GeneratedProduct = {
  title: string;
  description: string;
  brand: string;
  attributes: Attributes;
  price: number;
  discount: number;
};

const DISCOUNT = {
  noDiscountChance: 0.6, // most products are full price, like a real store
  bigDealChance: 0.1, // a few big deals
  normal: { min: 5, max: 30 },
  big: { min: 30, max: 60 },
} as const;

const MIN_PRICE = 1;

function randomValue(def: AttributeDef, brandOverride?: AttributeValue[]): AttributeValue {
  if (brandOverride) return faker.helpers.arrayElement(brandOverride);
  switch (def.type) {
    case AttributeType.Enum:
      return faker.helpers.arrayElement(def.values);
    case AttributeType.Number:
      return faker.helpers.arrayElement(def.values);
    case AttributeType.Boolean:
      return faker.datatype.boolean();
  }
}

// "Screen Size: 65 in" / "Active Noise Cancelling: Yes"
function describe(def: AttributeDef, value: AttributeValue): string {
  if (def.type === AttributeType.Boolean) return `${def.label}: ${value ? "Yes" : "No"}`;
  if (def.type === AttributeType.Number) return `${def.label}: ${value} ${def.unit}`;
  return `${def.label}: ${value}`;
}

function randomDiscount(): number {
  if (faker.datatype.boolean(DISCOUNT.noDiscountChance)) return 0;
  const range = faker.datatype.boolean(DISCOUNT.bigDealChance) ? DISCOUNT.big : DISCOUNT.normal;
  return faker.number.int(range);
}

export function generateProduct(type: ProductTypeDef): GeneratedProduct {
  const brand = faker.helpers.arrayElement(type.brands);
  const models = type.models?.[brand];
  const model = models ? faker.helpers.arrayElement(models) : undefined;

  const attributes: Attributes = Object.fromEntries(
    type.attributes.map((def) => [def.key, randomValue(def, type.brandValues?.[brand]?.[def.key])]),
  );

  const [min, max] = type.priceRange;
  const basePrice = faker.number.float({ min, max });
  const price = Math.max(MIN_PRICE, basePrice * (type.priceFactor?.(attributes) ?? 1));

  const title = type.title({ brand, model, attributes });

  // "About this item" bullets, one per line — like Amazon's feature list
  const description = [
    `Brand: ${brand}`,
    ...type.attributes.map((def) => describe(def, attributes[def.key])),
  ].join("\n");

  return {
    title,
    description,
    brand,
    attributes,
    price: Number(price.toFixed(2)),
    discount: randomDiscount(),
  };
}
