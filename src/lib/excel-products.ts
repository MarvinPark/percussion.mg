import * as XLSX from "xlsx";

export const EXCEL_HEADERS = [
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
  "3층",
  "B1",
  "의왕",
  "합계",
  "최소알림",
] as const;

const EXAMPLE_ROW = [
  "A사",
  "일렉기타",
  "Fender",
  "Stratocaster",
  "American Pro II",
  "FEN-STRAT-RED",
  "레드",
  "",
  "",
  1500000,
  2000000,
  2,
  1,
  0,
  3,
  2,
];

export type ExcelProductRow = {
  supplier: string;
  category: string;
  brand: string;
  product_name: string;
  model_name: string;
  sku: string;
  color: string;
  product_option: string;
  size: string;
  purchase_price: number;
  sale_price: number;
  stock_floor3: number;
  stock_b1: number;
  stock_display: number;
  stock_quantity: number;
  min_stock_quantity: number;
};

function cellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function hasCellValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isEmptyRow(row: ExcelProductRow) {
  return (
    !row.supplier &&
    !row.category &&
    !row.brand &&
    !row.product_name &&
    !row.model_name &&
    !row.sku
  );
}

function usesLegacyStockColumn(row: Record<string, unknown>) {
  const hasNewStockColumn =
    hasCellValue(row["3층"]) ||
    hasCellValue(row["B1"]) ||
    hasCellValue(row["의왕"]) ||
    hasCellValue(row["합계"]);

  return hasCellValue(row["현재고"]) && !hasNewStockColumn;
}

export function parseExcelStockFields(
  row: Record<string, unknown>,
  rowNumber?: number,
): { stock: Pick<ExcelProductRow, "stock_floor3" | "stock_b1" | "stock_display" | "stock_quantity">; error: string | null } {
  if (usesLegacyStockColumn(row)) {
    const stock_quantity = cellNumber(row["현재고"]);
    return {
      stock: {
        stock_floor3: stock_quantity,
        stock_b1: 0,
        stock_display: 0,
        stock_quantity,
      },
      error: null,
    };
  }

  const stock_floor3 = cellNumber(row["3층"]);
  const stock_b1 = cellNumber(row["B1"]);
  const stock_display = cellNumber(row["의왕"]);
  const locationSum = stock_floor3 + stock_b1 + stock_display;
  const hasTotalCell = hasCellValue(row["합계"]);
  const total = hasTotalCell ? cellNumber(row["합계"]) : locationSum;

  if (hasTotalCell && locationSum > 0 && total !== locationSum) {
    const prefix = rowNumber ? `${rowNumber}행: ` : "";
    return {
      stock: {
        stock_floor3,
        stock_b1,
        stock_display,
        stock_quantity: total,
      },
      error: `${prefix}합계(${total})와 3층+B1+의왕 합(${locationSum})이 일치하지 않습니다.`,
    };
  }

  if (hasTotalCell && locationSum === 0) {
    return {
      stock: {
        stock_floor3: total,
        stock_b1: 0,
        stock_display: 0,
        stock_quantity: total,
      },
      error: null,
    };
  }

  return {
    stock: {
      stock_floor3,
      stock_b1,
      stock_display,
      stock_quantity: locationSum,
    },
    error: null,
  };
}

export function createProductTemplateBuffer() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...EXCEL_HEADERS],
    [...EXAMPLE_ROW],
  ]);
  worksheet["!cols"] = EXCEL_HEADERS.map((header) => ({
    wch: header === "제품명" || header === "모델명" ? 18 : 12,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "제품등록");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function parseProductExcelBuffer(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { rows: [] as ExcelProductRow[], error: "엑셀 시트를 찾을 수 없습니다." };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const rows: ExcelProductRow[] = [];
  const stockErrors: string[] = [];

  for (let index = 0; index < jsonRows.length; index++) {
    const row = jsonRows[index];
    const rowNumber = index + 2;
    const { stock, error: stockError } = parseExcelStockFields(row, rowNumber);

    if (stockError) {
      stockErrors.push(stockError);
    }

    const parsed: ExcelProductRow = {
      supplier: cellValue(row["공급처"]),
      category: cellValue(row["품목"]),
      brand: cellValue(row["브랜드"]),
      product_name: cellValue(row["제품명"]),
      model_name: cellValue(row["모델명"]),
      sku: cellValue(row["SKU"]),
      color: cellValue(row["색상"]),
      product_option: cellValue(row["옵션"]),
      size: cellValue(row["사이즈"]),
      purchase_price: cellNumber(row["매입가"]),
      sale_price: cellNumber(row["소비자가"] ?? row["판매가"]),
      stock_floor3: stock.stock_floor3,
      stock_b1: stock.stock_b1,
      stock_display: stock.stock_display,
      stock_quantity: stock.stock_quantity,
      min_stock_quantity: cellNumber(row["최소알림"]),
    };

    if (!isEmptyRow(parsed)) {
      rows.push(parsed);
    }
  }

  if (stockErrors.length) {
    return { rows: [], error: stockErrors[0] };
  }

  if (!rows.length) {
    return { rows: [], error: "등록할 데이터가 없습니다. 양식을 확인해 주세요." };
  }

  return { rows, error: null };
}

export function validateExcelProductRow(row: ExcelProductRow, rowNumber: number) {
  if (!row.supplier) return `${rowNumber}행: 공급처를 입력해 주세요.`;
  if (!row.product_name) return `${rowNumber}행: 제품명을 입력해 주세요.`;
  if (!row.model_name) return `${rowNumber}행: 모델명을 입력해 주세요.`;
  if (!row.sku) return `${rowNumber}행: SKU를 입력해 주세요.`;
  if (row.purchase_price < 0 || row.sale_price < 0) {
    return `${rowNumber}행: 가격은 0 이상이어야 합니다.`;
  }
  if (
    row.stock_floor3 < 0 ||
    row.stock_b1 < 0 ||
    row.stock_display < 0 ||
    row.stock_quantity < 0 ||
    row.min_stock_quantity < 0
  ) {
    return `${rowNumber}행: 재고 수량은 0 이상이어야 합니다.`;
  }

  const locationSum = row.stock_floor3 + row.stock_b1 + row.stock_display;
  if (locationSum !== row.stock_quantity) {
    return `${rowNumber}행: 합계(${row.stock_quantity})와 3층+B1+의왕 합(${locationSum})이 일치하지 않습니다.`;
  }

  return null;
}

export function excelRowToPayload(row: ExcelProductRow) {
  return {
    supplier: row.supplier,
    category: row.category || null,
    brand: row.brand || null,
    product_name: row.product_name,
    model_name: row.model_name,
    sku: row.sku,
    color: row.color || null,
    product_option: row.product_option || null,
    size: row.size || null,
    purchase_price: row.purchase_price,
    sale_price: row.sale_price,
    stock_floor3: row.stock_floor3,
    stock_b1: row.stock_b1,
    stock_display: row.stock_display,
    stock_quantity: row.stock_quantity,
    min_stock_quantity: row.min_stock_quantity,
    stock_location: "3층",
    is_key_stock: false,
  };
}
