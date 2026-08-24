import type { ConfigurableTableColumn } from "@/lib/configurable-table-columns";

export type StockHistoryTableColumnId =
  | "date"
  | "modified_by"
  | "product"
  | "supplier"
  | "type"
  | "quantity"
  | "stock_change"
  | "note";

export const STOCK_HISTORY_TABLE_COLUMNS: ConfigurableTableColumn<StockHistoryTableColumnId>[] =
  [
    { id: "date", label: "날짜", minWidth: 120, defaultWidth: 144, resizable: true },
    {
      id: "modified_by",
      label: "수정자",
      minWidth: 72,
      defaultWidth: 96,
      resizable: true,
    },
    {
      id: "product",
      label: "제품명",
      minWidth: 120,
      defaultWidth: 180,
      resizable: true,
    },
    {
      id: "supplier",
      label: "공급처",
      minWidth: 80,
      defaultWidth: 112,
      resizable: true,
    },
    { id: "type", label: "종류", minWidth: 72, defaultWidth: 88, resizable: true },
    {
      id: "quantity",
      label: "수량",
      minWidth: 56,
      defaultWidth: 72,
      resizable: true,
      align: "right",
    },
    {
      id: "stock_change",
      label: "재고 변화",
      minWidth: 96,
      defaultWidth: 120,
      resizable: true,
    },
    { id: "note", label: "메모", minWidth: 120, defaultWidth: 180, resizable: true },
  ];

export function getStockHistoryColumnOrderStorageKey(userId: string) {
  return `pc-stock-history-column-order-${userId}`;
}

export function getStockHistoryColumnWidthStorageKey(userId: string) {
  return `pc-stock-history-column-widths-${userId}`;
}
