import * as XLSX from "xlsx";

export const SALES_IMPORT_TEMPLATE_HEADERS = [
  "관리번호",
  "판매일",
  "제품명",
  "모델명",
  "자체품목코드",
  "옵션",
  "수량",
  "판매단가",
  "결제수단",
  "구분",
  "거래처",
  "고객명",
  "연락처",
  "주소",
  "배송비",
  "비고",
] as const;

const EXAMPLE_ROW: Record<(typeof SALES_IMPORT_TEMPLATE_HEADERS)[number], string | number> =
  {
    관리번호: "20250928-001",
    판매일: "2025-09-28",
    제품명: "X32 컴팩트 32채널",
    모델명: "X32C",
    자체품목코드: "",
    옵션: "",
    수량: 1,
    판매단가: 1990000,
    결제수단: "카드",
    구분: "",
    거래처: "○○학교",
    고객명: "홍길동",
    연락처: "010-1234-5678",
    주소: "",
    배송비: 0,
    비고: "",
  };

const GUIDE_ROWS = [
  {
    A: "※ 안내 (아래 예시 행은 업로드 전 삭제하세요)",
  },
  {
    A: "관리번호: 행마다 서로 다른 값 권장 (재업로드 시 중복 방지)",
  },
  {
    A: "결제수단: 시스템 등록명과 같으면 자동 선택, 아니면 업로드 후 드롭다운에서 선택",
  },
  {
    A: "구분: 비우면 미리보기 기본 구분 사용 (관리자에 등록된 이름만)",
  },
];

export function buildSalesImportTemplateWorkbook() {
  const sheet = XLSX.utils.aoa_to_sheet([
    ...GUIDE_ROWS.map((row) => [row.A]),
    [],
    [...SALES_IMPORT_TEMPLATE_HEADERS],
    SALES_IMPORT_TEMPLATE_HEADERS.map((header) => EXAMPLE_ROW[header]),
  ]);

  sheet["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 6 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
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
