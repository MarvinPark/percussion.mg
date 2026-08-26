export const MIN_TABLE_ROW_FONT_SIZE = 9;
export const MAX_TABLE_ROW_FONT_SIZE = 16;
export const DEFAULT_TABLE_ROW_FONT_SIZE = 12;

export function getTableRowFontSizeStorageKey(prefix: string, userId: string) {
  return `pc-${prefix}-row-font-size-${userId}`;
}

export function clampTableRowFontSize(value: number) {
  return Math.min(
    MAX_TABLE_ROW_FONT_SIZE,
    Math.max(MIN_TABLE_ROW_FONT_SIZE, Math.round(value)),
  );
}

export function loadTableRowFontSize(prefix: string, userId: string) {
  if (typeof window === "undefined") return DEFAULT_TABLE_ROW_FONT_SIZE;

  try {
    const raw = localStorage.getItem(getTableRowFontSizeStorageKey(prefix, userId));
    if (!raw) return DEFAULT_TABLE_ROW_FONT_SIZE;

    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return DEFAULT_TABLE_ROW_FONT_SIZE;

    return clampTableRowFontSize(parsed);
  } catch {
    return DEFAULT_TABLE_ROW_FONT_SIZE;
  }
}

export function saveTableRowFontSize(
  prefix: string,
  userId: string,
  fontSize: number,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getTableRowFontSizeStorageKey(prefix, userId),
    String(clampTableRowFontSize(fontSize)),
  );
}

export function getTableRowPaddingClass(fontSize: number) {
  if (fontSize <= 10) return "py-0.5";
  if (fontSize <= 12) return "py-1";
  return "py-1.5";
}

export function getTableHeaderPaddingClass(fontSize: number) {
  if (fontSize <= 10) return "py-1";
  if (fontSize <= 12) return "py-1.5";
  return "py-2";
}

/** 거래처 목록 행 높이 (매출 대비 약 1.5배) */
export function getPartnersTableRowPaddingClass(fontSize: number) {
  if (fontSize <= 10) return "py-1.5";
  if (fontSize <= 12) return "py-2";
  return "py-2.5";
}

export function getPartnersTableHeaderPaddingClass(fontSize: number) {
  if (fontSize <= 10) return "py-2";
  if (fontSize <= 12) return "py-2.5";
  return "py-3";
}
