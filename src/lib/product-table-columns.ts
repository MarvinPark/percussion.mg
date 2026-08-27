export type ProductTableColumnId =
  | "checkbox"
  | "key_stock"
  | "supplier"
  | "category"
  | "brand"
  | "product_name"
  | "model_name"
  | "sku"
  | "stock_floor3"
  | "stock_b1"
  | "stock_display"
  | "reserved_quantity"
  | "stock_quantity"
  | "purchase_price"
  | "sale_price"
  | "actions";

export type ProductTableColumn = {
  id: ProductTableColumnId;
  label: string;
  minWidth: number;
  defaultWidth: number;
  resizable: boolean;
};

export const PRODUCT_TABLE_COLUMNS: ProductTableColumn[] = [
  { id: "checkbox", label: "", minWidth: 40, defaultWidth: 44, resizable: false },
  { id: "key_stock", label: "", minWidth: 32, defaultWidth: 36, resizable: false },
  { id: "supplier", label: "공급처", minWidth: 64, defaultWidth: 88, resizable: true },
  { id: "category", label: "품목", minWidth: 64, defaultWidth: 80, resizable: true },
  { id: "brand", label: "브랜드", minWidth: 64, defaultWidth: 80, resizable: true },
  {
    id: "product_name",
    label: "제품명",
    minWidth: 96,
    defaultWidth: 180,
    resizable: true,
  },
  { id: "model_name", label: "모델명", minWidth: 80, defaultWidth: 110, resizable: true },
  { id: "sku", label: "SKU", minWidth: 72, defaultWidth: 100, resizable: true },
  {
    id: "purchase_price",
    label: "매입가",
    minWidth: 72,
    defaultWidth: 96,
    resizable: true,
  },
  { id: "sale_price", label: "소비자가", minWidth: 72, defaultWidth: 96, resizable: true },
  { id: "stock_floor3", label: "3층", minWidth: 44, defaultWidth: 52, resizable: true },
  { id: "stock_b1", label: "B1", minWidth: 44, defaultWidth: 52, resizable: true },
  { id: "stock_display", label: "의왕", minWidth: 44, defaultWidth: 52, resizable: true },
  {
    id: "reserved_quantity",
    label: "예약",
    minWidth: 72,
    defaultWidth: 96,
    resizable: true,
  },
  { id: "stock_quantity", label: "가용", minWidth: 48, defaultWidth: 56, resizable: true },
  { id: "actions", label: "변경", minWidth: 72, defaultWidth: 88, resizable: false },
];

export function getDefaultColumnWidths() {
  return Object.fromEntries(
    PRODUCT_TABLE_COLUMNS.map((column) => [column.id, column.defaultWidth]),
  ) as Record<ProductTableColumnId, number>;
}

export function getColumnStorageKey(userId: string) {
  return `pc-product-column-widths-${userId}`;
}

export function loadColumnWidths(userId: string) {
  const defaults = getDefaultColumnWidths();

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(getColumnStorageKey(userId));
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<Record<ProductTableColumnId, number>>;
    const merged = { ...defaults };

    for (const column of PRODUCT_TABLE_COLUMNS) {
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

export function saveColumnWidths(
  userId: string,
  widths: Record<ProductTableColumnId, number>,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getColumnStorageKey(userId), JSON.stringify(widths));
}
