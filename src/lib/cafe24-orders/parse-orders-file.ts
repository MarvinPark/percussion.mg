import * as XLSX from "xlsx";
import type {
  ParsedCafe24OrderRow,
  SalesImportFileFormat,
} from "@/lib/cafe24-orders/types";

export type OrderImportFileFormat = SalesImportFileFormat;

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

function detectFormat(headerKeys: string[]): OrderImportFileFormat | null {
  if (headerKeys.includes("제품명") && headerKeys.includes("판매일")) {
    return "template";
  }
  if (!headerKeys.includes("주문번호") || !headerKeys.includes("주문상품명")) {
    return null;
  }
  if (headerKeys.includes("품목별 주문번호")) {
    return "brightsound";
  }
  return "cafe24";
}

function isGuideOrHeaderRow(row: Record<string, unknown>) {
  const firstCell = String(Object.values(row)[0] ?? "").trim();
  if (firstCell.startsWith("※")) return true;
  if (pickString(row, "제품명") === "제품명") return true;
  return false;
}

function mapTemplateRow(
  row: Record<string, unknown>,
  index: number,
): ParsedCafe24OrderRow | null {
  if (isGuideOrHeaderRow(row)) return null;

  const productName = pickString(row, "제품명");
  if (!productName) return null;

  const managementNo = pickString(row, "관리번호");
  const importModelName = pickString(row, "모델명");
  const sellerProductCode = pickString(row, "SKU", "자체품목코드");
  const productOption = pickString(row, "옵션");
  const orderNo = managementNo || `행-${index + 1}`;
  const quantity = Math.max(1, Math.round(pickNumber(row, "수량")));
  const unitSalePrice = Math.max(0, Math.round(pickNumber(row, "판매단가")));

  return {
    lineId: buildLineId({
      orderNo,
      productNo: importModelName,
      sellerProductCode,
      productOption: productOption || productName,
    }),
    importFormat: "template",
    mallName: "",
    orderNo,
    soldAt: parseSoldAt(row["판매일"]),
    productName,
    productNo: "",
    productOption,
    importModelName,
    sellerProductCode,
    cafe24PaymentMethod: pickString(row, "결제수단"),
    paymentProvider: "",
    unitSalePrice,
    quantity,
    customerName: pickString(row, "고객명"),
    customerPhone: pickString(row, "연락처"),
    customerAddress: pickString(row, "주소"),
    businessPartner: pickString(row, "거래처"),
    saleCategoryHint: pickString(row, "구분"),
    shippingCostFromFile: Math.max(0, Math.round(pickNumber(row, "배송비"))),
    note: pickString(row, "비고"),
  };
}

function extractBrightsoundProductOption(
  productName: string,
  productNameWithOption: string,
) {
  if (!productNameWithOption || productNameWithOption === productName) {
    return "";
  }

  const modelMatch = productNameWithOption.match(/\(모델=([^)]+)\)/);
  if (modelMatch) return modelMatch[1]!.trim();

  if (productNameWithOption.startsWith(productName)) {
    const rest = productNameWithOption.slice(productName.length).trim();
    return rest.replace(/^[\s\-·]+/, "");
  }

  return "";
}

function extractBrightsoundSellerProductCode(
  productOption: string,
  productNameWithOption: string,
) {
  if (productOption.trim()) return productOption.trim();

  const modelMatch = productNameWithOption.match(/\(모델=([^)]+)\)/);
  if (modelMatch) return modelMatch[1]!.trim();

  return "";
}

function mapBrightsoundRow(row: Record<string, unknown>): ParsedCafe24OrderRow | null {
  const orderNo = pickString(row, "주문번호");
  const productName = pickString(row, "주문상품명");
  if (!orderNo || !productName) return null;

  const lineItemNo = pickString(row, "품목별 주문번호");
  const productNameWithOption = pickString(row, "주문상품명(옵션포함)");
  const productOption = extractBrightsoundProductOption(
    productName,
    productNameWithOption,
  );
  const productNo = pickString(row, "상품번호");
  const sellerProductCode = extractBrightsoundSellerProductCode(
    productOption,
    productNameWithOption,
  );
  const quantity = Math.max(1, Math.round(pickNumber(row, "수량")));
  const unitSalePrice = Math.max(0, Math.round(pickNumber(row, "판매가")));
  const addressBase = pickString(row, "수령인 주소");
  const addressDetail = pickString(row, "수령인 상세 주소");
  const customerAddress = [addressBase, addressDetail].filter(Boolean).join(" ");

  return {
    lineId:
      lineItemNo ||
      buildLineId({
        orderNo,
        productNo,
        sellerProductCode,
        productOption,
      }),
    importFormat: "brightsound",
    mallName: pickString(row, "쇼핑몰"),
    orderNo,
    soldAt: parseSoldAt(row["발주일"]),
    productName,
    productNo,
    productOption,
    importModelName: "",
    sellerProductCode,
    cafe24PaymentMethod: pickString(row, "결제수단"),
    paymentProvider: pickString(row, "결제구분"),
    unitSalePrice,
    quantity,
    customerName: pickString(row, "수령인"),
    customerPhone: pickString(row, "수령인 휴대전화"),
    customerAddress,
    businessPartner: "",
    saleCategoryHint: "",
    shippingCostFromFile: 0,
    note: pickString(row, "배송메시지"),
  };
}

function mapCafe24Row(row: Record<string, unknown>): ParsedCafe24OrderRow | null {
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
    importFormat: "cafe24",
    mallName: pickString(row, "쇼핑몰"),
    orderNo,
    soldAt: parseSoldAt(row["발주일"]),
    productName,
    productNo,
    productOption,
    importModelName: "",
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
    businessPartner: "",
    saleCategoryHint: "",
    shippingCostFromFile: 0,
    note: pickString(row, "비고"),
  };
}

export function parseCafe24OrdersFile(
  buffer: ArrayBuffer,
):
  | { rows: ParsedCafe24OrderRow[]; format: OrderImportFileFormat }
  | { error: string } {
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
    const format = detectFormat(headerKeys);
    if (!format) {
      return {
        error:
          "지원하지 않는 파일 형식입니다. 매출 일괄등록 양식, 카페24, Brightsound 주문 엑셀(CSV/XLSX) 중 하나를 사용해 주세요.",
      };
    }

    const rows =
      format === "template"
        ? jsonRows
            .map((row, index) => mapTemplateRow(row, index))
            .filter((row): row is ParsedCafe24OrderRow => row !== null)
        : jsonRows
            .map((row) =>
              format === "brightsound"
                ? mapBrightsoundRow(row)
                : mapCafe24Row(row),
            )
            .filter((row): row is ParsedCafe24OrderRow => row !== null);

    if (rows.length === 0) {
      return { error: "등록 가능한 행을 찾지 못했습니다." };
    }

    return { rows, format };
  } catch {
    return { error: "엑셀 파일을 읽지 못했습니다." };
  }
}

export function formatLabelForImportFormat(format: OrderImportFileFormat) {
  switch (format) {
    case "template":
      return "매출 일괄등록 양식";
    case "brightsound":
      return "Brightsound 주문";
    default:
      return "카페24 주문";
  }
}
