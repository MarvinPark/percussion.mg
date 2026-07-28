import {
  normalizeMatchText,
  type ParsedUpdateRow,
  type ProductFieldKey,
} from "@/lib/excel-field-keys";
import type { Product } from "@/types/product";

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(num) ? null : num;
}

export function findMatchingProduct(row: ParsedUpdateRow, products: Product[]) {
  const sku = normalizeMatchText(String(row.values.sku ?? ""));
  const supplier = normalizeMatchText(String(row.values.supplier ?? ""));
  const modelName = normalizeMatchText(String(row.values.model_name ?? ""));
  const productName = normalizeMatchText(String(row.values.product_name ?? ""));

  const tryMatch = (candidates: Product[]) => {
    if (candidates.length === 1) return candidates[0];
    return null;
  };

  if (sku && supplier) {
    const matched = products.filter(
      (product) =>
        normalizeMatchText(product.sku) === sku &&
        normalizeMatchText(product.supplier) === supplier,
    );
    const found = tryMatch(matched);
    if (found) return found;
  }

  if (sku) {
    const matched = products.filter(
      (product) => normalizeMatchText(product.sku) === sku,
    );
    const found = tryMatch(matched);
    if (found) return found;
  }

  if (modelName && supplier) {
    const matched = products.filter(
      (product) =>
        normalizeMatchText(product.model_name) === modelName &&
        normalizeMatchText(product.supplier) === supplier,
    );
    const found = tryMatch(matched);
    if (found) return found;
  }

  if (modelName) {
    const exact = products.filter(
      (product) => normalizeMatchText(product.model_name) === modelName,
    );
    const found = tryMatch(exact);
    if (found) return found;

    const partial = products.filter((product) =>
      normalizeMatchText(product.model_name).includes(modelName),
    );
    const partialFound = tryMatch(partial);
    if (partialFound) return partialFound;
  }

  if (productName && supplier) {
    const matched = products.filter(
      (product) =>
        normalizeMatchText(product.product_name) === productName &&
        normalizeMatchText(product.supplier) === supplier,
    );
    const found = tryMatch(matched);
    if (found) return found;
  }

  if (productName) {
    const exact = products.filter(
      (product) => normalizeMatchText(product.product_name) === productName,
    );
    const found = tryMatch(exact);
    if (found) return found;

    const partial = products.filter((product) =>
      normalizeMatchText(product.product_name).includes(productName),
    );
    const partialFound = tryMatch(partial);
    if (partialFound) return partialFound;
  }

  return null;
}

export function buildUpdatePayload(
  row: ParsedUpdateRow,
  product: Product,
): Partial<Product> | null {
  const payload: Partial<Product> = {};
  const numericFields: ProductFieldKey[] = [
    "purchase_price",
    "sale_price",
    "stock_quantity",
    "min_stock_quantity",
  ];
  const textFields: ProductFieldKey[] = [
    "supplier",
    "category",
    "brand",
    "product_name",
    "model_name",
    "sku",
    "color",
    "product_option",
    "size",
  ];

  for (const field of textFields) {
    const value = row.values[field];
    if (typeof value === "string" && value.trim()) {
      (payload as Record<string, string | null>)[field] = value.trim();
    }
  }

  for (const field of numericFields) {
    const value = row.values[field];
    if (typeof value === "number" && !Number.isNaN(value)) {
      (payload as Record<string, number>)[field] = value;
    }
  }

  const hasChanges = (Object.keys(payload) as (keyof Product)[]).some((key) => {
    return payload[key] !== product[key];
  });

  return hasChanges ? payload : null;
}

export function rowFromMappedValues(
  rowNumber: number,
  rawRow: Record<string, unknown>,
  mapping: Partial<Record<ProductFieldKey, string>>,
): ParsedUpdateRow {
  const values: ParsedUpdateRow["values"] = {};
  const numericFields: ProductFieldKey[] = [
    "purchase_price",
    "sale_price",
    "stock_quantity",
    "min_stock_quantity",
  ];

  (Object.keys(mapping) as ProductFieldKey[]).forEach((field) => {
    const header = mapping[field];
    if (!header) return;

    const rawValue = rawRow[header];
    if (numericFields.includes(field)) {
      const num = cellNumber(rawValue);
      if (num !== null) values[field] = num;
    } else {
      const text = cellText(rawValue);
      if (text) values[field] = text;
    }
  });

  return { rowNumber, values };
}
