export type SalesTableColumnId =
  | "seller"
  | "category"
  | "date"
  | "product"
  | "quantity"
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
};

export const SALES_TABLE_COLUMNS: SalesTableColumn[] = [
  { id: "seller", label: "판매자" },
  { id: "category", label: "구분" },
  { id: "date", label: "날짜" },
  { id: "product", label: "제품" },
  { id: "quantity", label: "수량" },
  { id: "total_amount", label: "매출" },
  { id: "fee", label: "수수료" },
  { id: "margin", label: "마진" },
  { id: "customer", label: "고객" },
  { id: "payment", label: "결제" },
  { id: "actions", label: "수정", align: "right" },
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
