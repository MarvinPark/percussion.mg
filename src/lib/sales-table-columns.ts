export type SalesTableColumnId =
  | "seller"
  | "category"
  | "date"
  | "product"
  | "quantity"
  | "purchase_price"
  | "total_amount"
  | "fee"
  | "margin"
  | "customer"
  | "payment"
  | "actions";

export type SalesTableColumn = {
  id: SalesTableColumnId;
  label: string;
  align?: "left" | "right";
  minWidth: number;
  defaultWidth: number;
  resizable: boolean;
};

export const SALES_TABLE_COLUMNS: SalesTableColumn[] = [
  { id: "seller", label: "판매자", minWidth: 64, defaultWidth: 80, resizable: true },
  { id: "category", label: "구분", minWidth: 56, defaultWidth: 72, resizable: true },
  { id: "date", label: "날짜", minWidth: 56, defaultWidth: 68, resizable: true },
  { id: "product", label: "제품", minWidth: 100, defaultWidth: 160, resizable: true },
  { id: "quantity", label: "수량", minWidth: 48, defaultWidth: 56, resizable: true },
  {
    id: "purchase_price",
    label: "매입가",
    align: "right",
    minWidth: 72,
    defaultWidth: 88,
    resizable: true,
  },
  { id: "total_amount", label: "매출", minWidth: 72, defaultWidth: 88, resizable: true },
  { id: "fee", label: "수수료", minWidth: 72, defaultWidth: 88, resizable: true },
  { id: "margin", label: "마진", minWidth: 72, defaultWidth: 88, resizable: true },
  { id: "customer", label: "고객", minWidth: 80, defaultWidth: 112, resizable: true },
  { id: "payment", label: "결제", minWidth: 64, defaultWidth: 80, resizable: true },
  {
    id: "actions",
    label: "수정",
    align: "right",
    minWidth: 72,
    defaultWidth: 88,
    resizable: false,
  },
];

export const SALES_FIXED_END_COLUMN_IDS: SalesTableColumnId[] = ["actions"];

export function getSalesColumnOrderStorageKey(userId: string) {
  return `pc-sales-column-order-${userId}`;
}

export function getDefaultSalesColumnOrder(canManageSales: boolean) {
  return SALES_TABLE_COLUMNS.filter(
    (column) => canManageSales || column.id !== "actions",
  )
    .map((column) => column.id)
    .filter((columnId) => !SALES_FIXED_END_COLUMN_IDS.includes(columnId));
}

export function getSalesBaseColumns(canManageSales: boolean) {
  return canManageSales
    ? SALES_TABLE_COLUMNS
    : SALES_TABLE_COLUMNS.filter((column) => column.id !== "actions");
}

export function isReorderableSalesColumn(columnId: SalesTableColumnId) {
  return !SALES_FIXED_END_COLUMN_IDS.includes(columnId);
}

export function getDefaultSalesColumnWidths() {
  return Object.fromEntries(
    SALES_TABLE_COLUMNS.map((column) => [column.id, column.defaultWidth]),
  ) as Record<SalesTableColumnId, number>;
}

export function getSalesColumnWidthStorageKey(userId: string) {
  return `pc-sales-column-widths-${userId}`;
}

export function loadSalesColumnWidths(userId: string) {
  const defaults = getDefaultSalesColumnWidths();

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(getSalesColumnWidthStorageKey(userId));
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<Record<SalesTableColumnId, number>>;
    const merged = { ...defaults };

    for (const column of SALES_TABLE_COLUMNS) {
      const value = parsed[column.id];
      if (typeof value === "number" && value >= column.minWidth) {
        merged[column.id] = value;
      }
    }

    return merged;
  } catch {
    return defaults;
  }
}

export function saveSalesColumnWidths(
  userId: string,
  widths: Record<SalesTableColumnId, number>,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getSalesColumnWidthStorageKey(userId), JSON.stringify(widths));
}
