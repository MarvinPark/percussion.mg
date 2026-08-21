import * as XLSX from "xlsx";
import {
  mapColumnsHeuristic,
  mappingConfidence,
  resolveColumnMapping,
} from "@/lib/excel-column-mapper";
import {
  normalizeHeader,
  type ColumnMapping,
  type ProductFieldKey,
} from "@/lib/excel-field-keys";
import { EXCEL_EXPORT_ID_HEADER } from "@/lib/excel-products";
import {
  buildUpdatePayload,
  describeMissingChanges,
  findMatchingProduct,
  rowFromMappedValues,
} from "@/lib/product-matcher";
import type { Product } from "@/types/product";

const UPDATE_TEMPLATE_HEADERS = [
  "공급처",
  "품목",
  "브랜드",
  "제품명",
  "모델명",
  "SKU",
  "색상",
  "옵션",
  "사이즈",
  "매입가",
  "소비자가",
  "현재고",
  "최소알림",
] as const;

function isRowEmpty(rawRow: Record<string, unknown>) {
  return Object.values(rawRow).every((value) => String(value ?? "").trim() === "");
}

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function stripBom(value: string) {
  return value.replace(/^\uFEFF/, "");
}

function normalizeExcelRows(jsonRows: Record<string, unknown>[]) {
  return jsonRows.map((rawRow) => {
    const normalizedRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawRow)) {
      normalizedRow[stripBom(key).trim()] = value;
    }
    return normalizedRow;
  });
}

function findHeader(headers: string[], label: string) {
  return headers.find((header) => normalizeHeader(header) === normalizeHeader(label));
}

function isProductListExportFormat(headers: string[]) {
  const hasCoreColumns = ["제품명", "SKU", "공급처"].every((header) =>
    Boolean(findHeader(headers, header)),
  );
  const hasStockColumn =
    Boolean(findHeader(headers, "합계")) ||
    Boolean(findHeader(headers, "현재고"));

  return hasCoreColumns && hasStockColumn;
}

/** 제품목록 다운받기 형식(3층/B1/의왕/합계 등)을 엑셀 수정용 열로 매핑합니다. */
function mapProductListExportColumns(headers: string[]): ColumnMapping | null {
  if (!isProductListExportFormat(headers)) {
    return null;
  }

  const mapping: ColumnMapping = {};
  const pairs: [ProductFieldKey, string][] = [
    ["supplier", "공급처"],
    ["category", "품목"],
    ["brand", "브랜드"],
    ["product_name", "제품명"],
    ["model_name", "모델명"],
    ["sku", "SKU"],
    ["color", "색상"],
    ["product_option", "옵션"],
    ["size", "사이즈"],
    ["purchase_price", "매입가"],
    ["sale_price", "소비자가"],
    ["min_stock_quantity", "최소알림"],
  ];

  for (const [field, label] of pairs) {
    const header = findHeader(headers, label);
    if (header) {
      mapping[field] = header;
    }
  }

  const totalHeader = findHeader(headers, "합계");
  const stockHeader = findHeader(headers, "현재고");
  if (totalHeader) {
    mapping.stock_quantity = totalHeader;
  } else if (stockHeader) {
    mapping.stock_quantity = stockHeader;
  }

  return mapping;
}

function readProductId(rawRow: Record<string, unknown>) {
  const directKeys = [EXCEL_EXPORT_ID_HEADER, "id", "제품ID"];
  for (const key of directKeys) {
    const header = findHeader(Object.keys(rawRow), key);
    if (header) {
      const id = cellText(rawRow[header]);
      if (id) return id.trim();
    }
  }

  return "";
}

export function createProductUpdateTemplateBuffer(products: Product[]) {
  const rows = products.map((product) => [
    product.supplier,
    product.category ?? "",
    product.brand ?? "",
    product.product_name,
    product.model_name,
    product.sku,
    product.color ?? "",
    product.product_option ?? "",
    product.size ?? "",
    product.purchase_price,
    product.sale_price,
    product.stock_quantity,
    product.min_stock_quantity,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([
    [...UPDATE_TEMPLATE_HEADERS],
    ...rows,
  ]);
  worksheet["!cols"] = UPDATE_TEMPLATE_HEADERS.map(() => ({ wch: 14 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "제품수정");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function parseAndMatchProductUpdates(
  buffer: ArrayBuffer,
  products: Product[],
): Promise<ProductUpdateParseResult> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { error: "엑셀 시트를 찾을 수 없습니다." };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = normalizeExcelRows(
    XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    }),
  );

  if (!jsonRows.length) {
    return { error: "수정할 데이터가 없습니다." };
  }

  const headers = Object.keys(jsonRows[0] ?? {});
  const sampleRows = jsonRows.slice(0, 3);

  const standardHeaders = UPDATE_TEMPLATE_HEADERS.every((header) =>
    headers.includes(header),
  );

  const exportMapping = mapProductListExportColumns(headers);

  let mappingResult = standardHeaders
    ? { mapping: mapColumnsHeuristic([...UPDATE_TEMPLATE_HEADERS]), usedAi: false }
    : exportMapping
      ? { mapping: exportMapping, usedAi: false }
      : await resolveColumnMapping(headers, sampleRows);

  if ("error" in mappingResult && mappingResult.error) {
    return { error: mappingResult.error };
  }

  const mapping = mappingResult.mapping;
  const usedAi = mappingResult.usedAi;
  const confidence = mappingConfidence(mapping);

  if (!confidence.isUsable) {
    return {
      error:
        "제품을 찾을 수 있는 정보(SKU, 모델명, 제품명)와 수정할 정보(가격, 재고 등)가 필요합니다.",
    };
  }

  const updates: {
    product: Product;
    payload: Partial<Product>;
    rowNumber: number;
  }[] = [];
  const errors: string[] = [];

  jsonRows.forEach((rawRow, index) => {
    if (isRowEmpty(rawRow)) return;

    const rowNumber = index + 2;
    const parsedRow = rowFromMappedValues(rowNumber, rawRow, mapping);
    const productId = readProductId(rawRow);
    const hasIdentifier = Boolean(
      productId ||
        parsedRow.values.sku ||
        parsedRow.values.model_name ||
        parsedRow.values.product_name,
    );

    if (!hasIdentifier) {
      errors.push(`${rowNumber}행: 제품을 찾을 SKU/모델명/제품명 정보가 없습니다.`);
      return;
    }

    const product = findMatchingProduct(parsedRow, products, productId || undefined);
    if (!product) {
      errors.push(`${rowNumber}행: 일치하는 제품을 찾지 못했습니다.`);
      return;
    }

    const payload = buildUpdatePayload(parsedRow, product, {
      rawRow,
      mapping,
    });
    if (!payload) {
      errors.push(
        `${rowNumber}행: 변경할 내용이 없습니다. ${describeMissingChanges(rawRow, product, mapping)}`,
      );
      return;
    }

    updates.push({ product, payload, rowNumber });
  });

  if (!updates.length) {
    return {
      error: "수정된 제품이 없습니다.",
      errors,
      usedAi,
    };
  }

  return { updates, errors, usedAi };
}

export type ProductUpdateParseResult =
  | {
      updates: {
        product: Product;
        payload: Partial<Product>;
        rowNumber: number;
      }[];
      errors: string[];
      usedAi: boolean;
      error?: string;
    }
  | {
      error: string;
      errors?: string[];
      usedAi?: boolean;
      updates?: never;
    };
