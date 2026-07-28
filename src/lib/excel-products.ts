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
  "현재고",
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

export function createProductTemplateBuffer() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...EXCEL_HEADERS],
    [...EXAMPLE_ROW],
  ]);
  worksheet["!cols"] = EXCEL_HEADERS.map(() => ({ wch: 14 }));

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

  for (const row of jsonRows) {
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
      stock_quantity: cellNumber(row["현재고"]),
      min_stock_quantity: cellNumber(row["최소알림"]),
    };

    if (!isEmptyRow(parsed)) {
      rows.push(parsed);
    }
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
  if (row.stock_quantity < 0 || row.min_stock_quantity < 0) {
    return `${rowNumber}행: 재고 수량은 0 이상이어야 합니다.`;
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
    stock_quantity: row.stock_quantity,
    min_stock_quantity: row.min_stock_quantity,
  };
}
