import * as XLSX from "xlsx";

export const SALES_IMPORT_TEMPLATE_HEADERS = [
  "구분",
  "판매일",
  "제품명",
  "모델명",
  "SKU",
  "수량",
  "판매단가",
  "결제수단",
  "거래처",
  "고객명",
  "연락처",
  "주소",
  "배송비",
  "비고",
] as const;

export function buildSalesImportTemplateWorkbook() {
  const sheet = XLSX.utils.aoa_to_sheet([[...SALES_IMPORT_TEMPLATE_HEADERS]]);

  sheet["!cols"] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 6 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 8 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "매출일괄등록");
  return workbook;
}

export function downloadSalesImportTemplate(fileName = "매출_일괄등록_양식.xlsx") {
  const workbook = buildSalesImportTemplateWorkbook();
  XLSX.writeFile(workbook, fileName);
}

export function normalizeImportPaymentLabel(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function matchPaymentMethodIdByName(
  label: string,
  paymentMethods: Array<{ id: string; name: string }>,
) {
  const normalized = normalizeImportPaymentLabel(label);
  if (!normalized) return "";

  const exact = paymentMethods.find(
    (method) =>
      normalizeImportPaymentLabel(method.name) === normalized,
  );
  if (exact) return exact.id;

  const partial = paymentMethods.find((method) => {
    const name = normalizeImportPaymentLabel(method.name);
    return name.includes(normalized) || normalized.includes(name);
  });
  return partial?.id ?? "";
}
