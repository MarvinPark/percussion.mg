export const MIN_TABLE_ROW_FONT_SIZE = 9;
export const MAX_TABLE_ROW_FONT_SIZE = 16;
export const DEFAULT_TABLE_ROW_FONT_SIZE = 12;
export const DEFAULT_PARTNERS_TABLE_ROW_FONT_SIZE = DEFAULT_TABLE_ROW_FONT_SIZE + 2;

export function getTableRowFontSizeStorageKey(prefix: string, userId: string) {
  return `pc-${prefix}-row-font-size-${userId}`;
}

export function clampTableRowFontSize(value: number) {
  return Math.min(
    MAX_TABLE_ROW_FONT_SIZE,
    Math.max(MIN_TABLE_ROW_FONT_SIZE, Math.round(value)),
  );
}

function getDefaultTableRowFontSize(prefix: string) {
  return prefix === "partners"
    ? DEFAULT_PARTNERS_TABLE_ROW_FONT_SIZE
    : DEFAULT_TABLE_ROW_FONT_SIZE;
}

export function loadTableRowFontSize(prefix: string, userId: string) {
  const defaultSize = getDefaultTableRowFontSize(prefix);
  if (typeof window === "undefined") return defaultSize;

  try {
    const raw = localStorage.getItem(getTableRowFontSizeStorageKey(prefix, userId));
    if (!raw) return defaultSize;

    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return defaultSize;

    return clampTableRowFontSize(parsed);
  } catch {
    return defaultSize;
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

/** 컬럼 헤더는 본문보다 2px 작게 (좁은 열 라벨 잘림 방지) */
export function getTableHeaderFontSize(rowFontSize: number) {
  return clampTableRowFontSize(rowFontSize - 2);
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
