import * as XLSX from "xlsx";
import {
  normalizeBusinessPartnerInput,
  normalizeOptionalText,
} from "@/lib/business-partners";
import type { BusinessPartnerType } from "@/types/business-partner";

export const PARTNER_EXCEL_HEADERS = [
  "순번",
  "거래처등록번호",
  "종사업장번호",
  "거래처상호",
  "대표자명",
  "사업자주소",
  "업태",
  "종목",
  "부서명",
  "성명",
  "전화번호",
  "휴대전화번호",
  "팩스번호",
  "이메일주소",
  "비고",
  "구분",
  "등록일자",
] as const;

type ContactRole = "primary" | "secondary";

type ParsedPartnerRow = {
  rowNumbers: number[];
  corp_num_raw: string;
  invoice_tax_reg_id: string;
  corp_name: string;
  ceo_name: string;
  invoice_address: string;
  biz_type: string;
  biz_class: string;
  contact_role: ContactRole;
  invoice_contact_name: string;
  invoice_contact_dept: string;
  invoice_contact_tel: string;
  invoice_contact_hp: string;
  invoice_email: string;
};

export type ParsedPartnerImport = ReturnType<
  typeof normalizeBusinessPartnerInput
> & {
  rowNumbers: number[];
};

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeCorpNumKey(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 13) return digits;
  return null;
}

function detectPartnerType(corpNum: string): BusinessPartnerType {
  if (corpNum.length === 10) return "business";
  if (corpNum.length === 13) return "individual";
  return "foreigner";
}

function parseContactRole(value: string): ContactRole {
  return value.includes("부") ? "secondary" : "primary";
}

function isHeaderRow(row: unknown[]): boolean {
  const first = cellText(row[0]);
  const second = cellText(row[1]);
  return first === "순번" || second === "거래처등록번호";
}

function rowHasData(row: ParsedPartnerRow): boolean {
  return Boolean(row.corp_num_raw);
}

function parseDataRow(row: unknown[], rowNumber: number): ParsedPartnerRow | null {
  const corp_num_raw = cellText(row[1]);
  if (!corp_num_raw) return null;

  const roleLabel = cellText(row[15]);

  return {
    rowNumbers: [rowNumber],
    corp_num_raw,
    invoice_tax_reg_id: cellText(row[2]),
    corp_name: cellText(row[3]),
    ceo_name: cellText(row[4]),
    invoice_address: cellText(row[5]),
    biz_type: cellText(row[6]),
    biz_class: cellText(row[7]),
    contact_role: parseContactRole(roleLabel),
    invoice_contact_name: cellText(row[9]),
    invoice_contact_dept: cellText(row[8]),
    invoice_contact_tel: cellText(row[10]),
    invoice_contact_hp: cellText(row[11]),
    invoice_email: cellText(row[13]),
  };
}

type MergedPartnerRow = ParsedPartnerRow & {
  invoice_contact_name2?: string;
  invoice_contact_dept2?: string;
  invoice_contact_tel2?: string;
  invoice_contact_hp2?: string;
  invoice_contact_email2?: string;
};

function mergePartnerRows(
  primary: ParsedPartnerRow,
  secondary: ParsedPartnerRow,
): MergedPartnerRow {
  return {
    ...primary,
    rowNumbers: [...primary.rowNumbers, ...secondary.rowNumbers],
    invoice_tax_reg_id:
      primary.invoice_tax_reg_id || secondary.invoice_tax_reg_id,
    corp_name: primary.corp_name || secondary.corp_name,
    ceo_name: primary.ceo_name || secondary.ceo_name,
    invoice_address: primary.invoice_address || secondary.invoice_address,
    biz_type: primary.biz_type || secondary.biz_type,
    biz_class: primary.biz_class || secondary.biz_class,
    invoice_contact_name2: secondary.invoice_contact_name,
    invoice_contact_dept2: secondary.invoice_contact_dept,
    invoice_contact_tel2: secondary.invoice_contact_tel,
    invoice_contact_hp2: secondary.invoice_contact_hp,
    invoice_contact_email2: secondary.invoice_email,
  };
}

function toPartnerInput(
  row: MergedPartnerRow,
): ParsedPartnerImport | { error: string; rowNumbers: number[] } {
  const corpNumKey = normalizeCorpNumKey(row.corp_num_raw);
  if (!corpNumKey) {
    return {
      error: "거래처등록번호 형식이 올바르지 않습니다.",
      rowNumbers: row.rowNumbers,
    };
  }

  const partner_type = detectPartnerType(corpNumKey);
  const corp_name = row.corp_name || undefined;
  const ceo_name = row.ceo_name || undefined;
  const display_name =
    partner_type === "business"
      ? corp_name || ceo_name || row.corp_num_raw
      : ceo_name || corp_name || row.corp_num_raw;

  if (!display_name.trim()) {
    return {
      error: "거래처상호 또는 대표자명이 필요합니다.",
      rowNumbers: row.rowNumbers,
    };
  }

  const normalized = normalizeBusinessPartnerInput({
    partner_type,
    display_name,
    corp_num: row.corp_num_raw,
    corp_name,
    ceo_name,
    biz_type: row.biz_type || undefined,
    biz_class: row.biz_class || undefined,
    invoice_address: row.invoice_address || undefined,
    invoice_email: row.invoice_email || undefined,
    invoice_tax_reg_id: row.invoice_tax_reg_id || undefined,
    invoice_contact_name: row.invoice_contact_name || undefined,
    invoice_contact_dept: row.invoice_contact_dept || undefined,
    invoice_contact_tel: row.invoice_contact_tel || undefined,
    invoice_contact_hp: row.invoice_contact_hp || undefined,
    invoice_contact_name2: row.invoice_contact_name2 || undefined,
    invoice_contact_dept2: row.invoice_contact_dept2 || undefined,
    invoice_contact_tel2: row.invoice_contact_tel2 || undefined,
    invoice_contact_hp2: row.invoice_contact_hp2 || undefined,
    invoice_contact_email2: row.invoice_contact_email2 || undefined,
    contact_name: row.invoice_contact_name || ceo_name || undefined,
    contact_email: row.invoice_email || undefined,
    contact_address: row.invoice_address || undefined,
    contact_phone: row.invoice_contact_hp || row.invoice_contact_tel || undefined,
  });

  return {
    ...normalized,
    rowNumbers: row.rowNumbers,
  };
}

export function parsePartnerExcelBuffer(buffer: ArrayBuffer): {
  partners: ParsedPartnerImport[];
  errors: string[];
  error?: string;
} {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return { partners: [], errors: [], error: "엑셀 파일을 읽을 수 없습니다." };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { partners: [], errors: [], error: "시트가 비어 있습니다." };
  }

  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
  });

  if (matrix.length === 0) {
    return { partners: [], errors: [], error: "데이터가 없습니다." };
  }

  const startIndex = isHeaderRow(matrix[0] ?? []) ? 1 : 0;
  const grouped = new Map<string, MergedPartnerRow>();

  for (let index = startIndex; index < matrix.length; index++) {
    const rowNumber = index + 1;
    const parsed = parseDataRow(matrix[index] ?? [], rowNumber);
    if (!parsed || !rowHasData(parsed)) continue;

    const corpKey = normalizeCorpNumKey(parsed.corp_num_raw);
    if (!corpKey) {
      continue;
    }

    const existing = grouped.get(corpKey);
    if (!existing) {
      grouped.set(corpKey, parsed);
      continue;
    }

    if (parsed.contact_role === "secondary") {
      grouped.set(corpKey, mergePartnerRows(existing, parsed));
    } else if (existing.contact_role === "secondary") {
      grouped.set(corpKey, mergePartnerRows(parsed, existing));
    } else {
      grouped.set(corpKey, {
        ...existing,
        rowNumbers: [...existing.rowNumbers, ...parsed.rowNumbers],
        invoice_tax_reg_id:
          existing.invoice_tax_reg_id || parsed.invoice_tax_reg_id,
        corp_name: existing.corp_name || parsed.corp_name,
        ceo_name: existing.ceo_name || parsed.ceo_name,
        invoice_address: existing.invoice_address || parsed.invoice_address,
        biz_type: existing.biz_type || parsed.biz_type,
        biz_class: existing.biz_class || parsed.biz_class,
        invoice_contact_name:
          existing.invoice_contact_name || parsed.invoice_contact_name,
        invoice_contact_dept:
          existing.invoice_contact_dept || parsed.invoice_contact_dept,
        invoice_contact_tel:
          existing.invoice_contact_tel || parsed.invoice_contact_tel,
        invoice_contact_hp:
          existing.invoice_contact_hp || parsed.invoice_contact_hp,
        invoice_email: existing.invoice_email || parsed.invoice_email,
      });
    }
  }

  const partners: ParsedPartnerImport[] = [];
  const errors: string[] = [];

  for (const row of grouped.values()) {
    const result = toPartnerInput(row);

    if ("error" in result) {
      errors.push(`${result.rowNumbers.join(",")}행: ${result.error}`);
      continue;
    }

    if (!result.corp_num) {
      errors.push(
        `${result.rowNumbers.join(",")}행: 사업자등록번호/주민등록번호 형식이 올바르지 않습니다.`,
      );
      continue;
    }

    partners.push(result);
  }

  if (partners.length === 0 && errors.length === 0) {
    return {
      partners: [],
      errors: [],
      error: "등록할 거래처 데이터가 없습니다. 양식을 확인해 주세요.",
    };
  }

  return { partners, errors };
}

export function createPartnerImportTemplateBuffer(): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...PARTNER_EXCEL_HEADERS],
    [
      1,
      "123-45-67890",
      "",
      "예시 거래처",
      "홍길동",
      "서울시 중구 세종대로 110",
      "도소매",
      "악기",
      "경리",
      "김담당",
      "02-000-0000",
      "010-0000-0000",
      "",
      "tax@example.com",
      "",
      "주담당자",
      "20260101",
    ],
  ]);

  worksheet["!cols"] = PARTNER_EXCEL_HEADERS.map(() => ({ wch: 16 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "거래처 목록");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function formatPartnerImportRowLabel(rowNumbers: number[]) {
  if (rowNumbers.length === 1) return `${rowNumbers[0]}행`;
  return `${rowNumbers[0]}~${rowNumbers.at(-1)}행`;
}

export { normalizeOptionalText };
