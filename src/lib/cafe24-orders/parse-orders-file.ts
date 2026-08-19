import * as XLSX from "xlsx";
import type { ParsedCafe24OrderRow } from "@/lib/cafe24-orders/types";

function pickString(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function pickNumber(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSoldAt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const trimmed = String(value ?? "").trim();
  if (!trimmed) return new Date().toISOString().slice(0, 10);

  const dotted = trimmed.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (dotted) {
    const [, year, month, day] = dotted;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const dashed = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashed) {
    const [, year, month, day] = dashed;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function buildLineId(input: {
  orderNo: string;
  productNo: string;
  sellerProductCode: string;
  productOption: string;
}) {
  return [
    input.orderNo,
    input.productNo,
    input.sellerProductCode,
    input.productOption,
  ]
    .map((value) => value.trim())
    .join("|");
}

function mapRow(row: Record<string, unknown>): ParsedCafe24OrderRow | null {
  const orderNo = pickString(row, "주문번호");
  const productName = pickString(row, "주문상품명");
  if (!orderNo || !productName) return null;

  const productNo = pickString(row, "상품번호");
  const productOption = pickString(row, "옵션");
  const sellerProductCode = pickString(row, "자체품목코드");
  const quantity = Math.max(1, Math.round(pickNumber(row, "수량")));
  const unitSalePrice = Math.max(0, Math.round(pickNumber(row, "판매가")));

  return {
    lineId: buildLineId({
      orderNo,
      productNo,
      sellerProductCode,
      productOption,
    }),
    mallName: pickString(row, "쇼핑몰"),
    orderNo,
    soldAt: parseSoldAt(row["발주일"]),
    productName,
    productNo,
    productOption,
    sellerProductCode,
    cafe24PaymentMethod: pickString(row, "결제수단"),
    paymentProvider: pickString(row, "결제업체"),
    unitSalePrice,
    quantity,
    customerName: pickString(row, "주문자", "수령인"),
    customerPhone: pickString(
      row,
      "주문자핸드폰",
      "핸드폰",
      "주문자전화번호",
      "전화번호",
      "수령지전화",
    ),
    customerAddress: pickString(row, "주문자주소", "주소"),
    note: pickString(row, "비고"),
  };
}

export function parseCafe24OrdersFile(
  buffer: ArrayBuffer,
): { rows: ParsedCafe24OrderRow[] } | { error: string } {
  try {
    const workbook = XLSX.read(buffer, { type: "array", raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { error: "파일에 시트가 없습니다." };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (jsonRows.length === 0) {
      return { error: "주문 데이터가 없습니다." };
    }

    const headerKeys = Object.keys(jsonRows[0] ?? {});
    if (!headerKeys.includes("주문번호") || !headerKeys.includes("주문상품명")) {
      return {
        error:
          "카페24 주문 엑셀 형식이 아닙니다. 주문번호·주문상품명 열이 필요합니다.",
      };
    }

    const rows = jsonRows
      .map((row) => mapRow(row))
      .filter((row): row is ParsedCafe24OrderRow => row !== null);

    if (rows.length === 0) {
      return { error: "등록 가능한 주문 행을 찾지 못했습니다." };
    }

    return { rows };
  } catch {
    return { error: "엑셀 파일을 읽지 못했습니다." };
  }
}
