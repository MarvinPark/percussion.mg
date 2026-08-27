import {
  normalizeHeader,
  type ColumnMapping,
  type ParsedUpdateRow,
  type ProductFieldKey,
} from "@/lib/excel-field-keys";
import {
  hasLocationStockColumns,
  parseExcelStockFields,
} from "@/lib/excel-products";
import { normalizePurchasePrice } from "@/lib/product-duplicate";
import {
  inferPrimaryStockLocation,
  normalizeStockLocation,
} from "@/lib/stock-locations";
import type { Product } from "@/types/product";

const TEXT_FIELDS: ProductFieldKey[] = [
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

const NUMERIC_FIELDS: ProductFieldKey[] = [
  "purchase_price",
  "sale_price",
  "stock_quantity",
  "min_stock_quantity",
];

const DIRECT_HEADER_LABELS: Partial<Record<ProductFieldKey, string[]>> = {
  supplier: ["공급처"],
  category: ["품목"],
  brand: ["브랜드"],
  product_name: ["제품명"],
  model_name: ["모델명"],
  sku: ["SKU"],
  color: ["색상"],
  product_option: ["옵션"],
  size: ["사이즈"],
  purchase_price: ["매입가"],
  sale_price: ["소비자가", "판매가"],
  stock_quantity: ["합계", "실재고합계", "실재고 합계", "현재고"],
  min_stock_quantity: ["최소알림"],
};

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && value.text != null) {
      return String(value.text).trim();
    }
    if ("w" in value && value.w != null) {
      return String(value.w).trim();
    }
  }
  return String(value).trim();
}

function cellNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(num) ? null : num;
}

function normalizeCompareText(value: unknown) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function findRawHeader(
  rawRow: Record<string, unknown>,
  labels: string[],
) {
  const headers = Object.keys(rawRow);
  for (const label of labels) {
    const header = headers.find(
      (candidate) => normalizeHeader(candidate) === normalizeHeader(label),
    );
    if (header) return header;
  }
  return null;
}

function readMappedFieldValue(
  field: ProductFieldKey,
  rawRow: Record<string, unknown>,
  mapping?: ColumnMapping,
) {
  const header =
    mapping?.[field] ??
    findRawHeader(rawRow, DIRECT_HEADER_LABELS[field] ?? []);

  if (!header) return null;

  const rawValue = rawRow[header];
  if (NUMERIC_FIELDS.includes(field)) {
    return cellNumber(rawValue);
  }

  const text = cellText(rawValue);
  return text || null;
}

function extractRowValues(
  row: ParsedUpdateRow,
  rawRow?: Record<string, unknown>,
  mapping?: ColumnMapping,
) {
  const values: ParsedUpdateRow["values"] = { ...row.values };

  if (!rawRow) return values;

  for (const field of [...TEXT_FIELDS, ...NUMERIC_FIELDS]) {
    const parsed = readMappedFieldValue(field, rawRow, mapping);
    if (parsed === null) continue;

    if (NUMERIC_FIELDS.includes(field)) {
      if (typeof parsed === "number" && !Number.isNaN(parsed)) {
        values[field] = parsed;
      }
      continue;
    }

    if (typeof parsed === "string" && parsed) {
      values[field] = parsed;
    }
  }

  return values;
}

function fieldValuesEqual(
  field: ProductFieldKey,
  nextValue: string | number,
  currentValue: unknown,
) {
  if (NUMERIC_FIELDS.includes(field)) {
    return (
      normalizePurchasePrice(Number(nextValue)) ===
      normalizePurchasePrice(Number(currentValue))
    );
  }

  return (
    normalizeCompareText(nextValue) === normalizeCompareText(currentValue ?? "")
  );
}

export function findMatchingProduct(
  row: ParsedUpdateRow,
  products: Product[],
  productId?: string,
) {
  if (productId) {
    const normalizedId = productId.trim().toLowerCase();
    const byId = products.find(
      (product) => product.id.trim().toLowerCase() === normalizedId,
    );
    if (byId) return byId;
  }

  const sku = normalizeCompareText(row.values.sku ?? "").toLowerCase().replace(/\s+/g, "");
  const supplier = normalizeCompareText(row.values.supplier ?? "").toLowerCase().replace(/\s+/g, "");
  const modelName = normalizeCompareText(row.values.model_name ?? "").toLowerCase().replace(/\s+/g, "");
  const productName = normalizeCompareText(row.values.product_name ?? "").toLowerCase().replace(/\s+/g, "");

  const normalizeDbText = (value: unknown) =>
    normalizeCompareText(value).toLowerCase().replace(/\s+/g, "");

  const tryMatch = (candidates: Product[]) => {
    if (candidates.length === 1) return candidates[0];
    return null;
  };

  const disambiguate = (candidates: Product[]) => {
    if (candidates.length <= 1) return candidates[0] ?? null;

    const purchasePrice = row.values.purchase_price;
    if (typeof purchasePrice === "number") {
      const byPrice = candidates.filter(
        (product) =>
          normalizePurchasePrice(product.purchase_price) ===
          normalizePurchasePrice(purchasePrice),
      );
      const found = tryMatch(byPrice);
      if (found) return found;
    }

    return null;
  };

  if (sku && supplier) {
    const matched = products.filter(
      (product) =>
        normalizeDbText(product.sku) === sku &&
        normalizeDbText(product.supplier) === supplier,
    );
    const found = tryMatch(matched) ?? disambiguate(matched);
    if (found) return found;
  }

  if (sku) {
    const matched = products.filter(
      (product) => normalizeDbText(product.sku) === sku,
    );
    const found = tryMatch(matched) ?? disambiguate(matched);
    if (found) return found;
  }

  if (modelName && supplier) {
    const matched = products.filter(
      (product) =>
        normalizeDbText(product.model_name) === modelName &&
        normalizeDbText(product.supplier) === supplier,
    );
    const found = tryMatch(matched) ?? disambiguate(matched);
    if (found) return found;
  }

  if (modelName) {
    const exact = products.filter(
      (product) => normalizeDbText(product.model_name) === modelName,
    );
    const found = tryMatch(exact) ?? disambiguate(exact);
    if (found) return found;
  }

  if (productName && supplier) {
    const matched = products.filter(
      (product) =>
        normalizeDbText(product.product_name) === productName &&
        normalizeDbText(product.supplier) === supplier,
    );
    const found = tryMatch(matched) ?? disambiguate(matched);
    if (found) return found;
  }

  if (productName) {
    const exact = products.filter(
      (product) => normalizeDbText(product.product_name) === productName,
    );
    const found = tryMatch(exact) ?? disambiguate(exact);
    if (found) return found;
  }

  return null;
}

export function buildUpdatePayload(
  row: ParsedUpdateRow,
  product: Product,
  options?: {
    rawRow?: Record<string, unknown>;
    mapping?: ColumnMapping;
  },
): Partial<Product> | null {
  const values = extractRowValues(row, options?.rawRow, options?.mapping);
  const payload: Partial<Product> = {};
  const hasLocationColumns =
    options?.rawRow && hasLocationStockColumns(options.rawRow);

  for (const field of TEXT_FIELDS) {
    const value = values[field];
    if (typeof value !== "string" || !value.trim()) continue;
    const trimmed = value.trim();
    if (!fieldValuesEqual(field, trimmed, product[field])) {
      (payload as Record<string, string | null>)[field] = trimmed;
    }
  }

  for (const field of NUMERIC_FIELDS) {
    if (hasLocationColumns && field === "stock_quantity") continue;
    const value = values[field];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    if (!fieldValuesEqual(field, value, product[field])) {
      (payload as Record<string, number>)[field] = value;
    }
  }

  if (hasLocationColumns && options?.rawRow) {
    const { stock } = parseExcelStockFields(options.rawRow, row.rowNumber);
    const locationFields = [
      "stock_floor3",
      "stock_b1",
      "stock_display",
      "stock_quantity",
    ] as const;

    for (const field of locationFields) {
      if (stock[field] !== product[field]) {
        payload[field] = stock[field];
      }
    }

    const stockLocation = inferPrimaryStockLocation(stock);
    if (stockLocation !== normalizeStockLocation(product.stock_location)) {
      payload.stock_location = stockLocation;
    }
  }

  return Object.keys(payload).length ? payload : null;
}

export function rowFromMappedValues(
  rowNumber: number,
  rawRow: Record<string, unknown>,
  mapping: Partial<Record<ProductFieldKey, string>>,
): ParsedUpdateRow {
  const values: ParsedUpdateRow["values"] = {};

  (Object.keys(mapping) as ProductFieldKey[]).forEach((field) => {
    const parsed = readMappedFieldValue(field, rawRow, mapping);
    if (parsed === null) return;

    if (NUMERIC_FIELDS.includes(field)) {
      if (typeof parsed === "number" && !Number.isNaN(parsed)) {
        values[field] = parsed;
      }
      return;
    }

    if (typeof parsed === "string" && parsed) {
      values[field] = parsed;
    }
  });

  return { rowNumber, values };
}

export function describeMissingChanges(
  rawRow: Record<string, unknown>,
  product: Product,
  mapping?: ColumnMapping,
) {
  const excelName = cellText(
    readMappedFieldValue("product_name", rawRow, mapping) ?? "",
  );
  const dbName = product.product_name;

  if (
    excelName &&
    normalizeCompareText(excelName) !== normalizeCompareText(dbName)
  ) {
    return `제품명("${excelName}")과 DB("${dbName}")가 다르지만 반영되지 않았습니다. 파일을 저장한 뒤 다시 업로드해 주세요.`;
  }

  return "엑셀 내용이 DB와 동일합니다. '제품명' 열을 수정했는지, 파일 저장 후 업로드했는지 확인해 주세요.";
}
