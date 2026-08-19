export type KeyStockTableColumnId =
  | "brand"
  | "model"
  | "floor3"
  | "b1"
  | "uiwang"
  | "reserved"
  | "total"
  | "unit";

export type KeyStockTableColumn = {
  id: KeyStockTableColumnId;
  label: string;
  align: "left" | "center" | "right";
  width: number;
};

export const KEY_STOCK_TABLE_COLUMNS: KeyStockTableColumn[] = [
  { id: "brand", label: "제조사", align: "left", width: 80 },
  { id: "model", label: "모델", align: "left", width: 112 },
  { id: "floor3", label: "3층", align: "center", width: 40 },
  { id: "b1", label: "B1", align: "center", width: 40 },
  { id: "uiwang", label: "의왕", align: "center", width: 40 },
  { id: "reserved", label: "예약", align: "center", width: 48 },
  { id: "total", label: "총수량", align: "center", width: 44 },
  { id: "unit", label: "단가", align: "right", width: 76 },
];

export function getKeyStockColumnOrderStorageKey(userId: string) {
  return `pc-key-stock-column-order-${userId}`;
}

export function getDefaultKeyStockColumnOrder() {
  return KEY_STOCK_TABLE_COLUMNS.map((column) => column.id);
}

export function getKeyStockSectionWidth(columns: KeyStockTableColumn[]) {
  return columns.reduce((sum, column) => sum + column.width, 0);
}
