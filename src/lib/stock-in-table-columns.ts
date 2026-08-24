import type { ConfigurableTableColumn } from "@/lib/configurable-table-columns";

export type StockInTableColumnId =
  | "checkbox"
  | "movement_date"
  | "created_time"
  | "modified_by"
  | "supplier"
  | "product_name"
  | "model_name"
  | "quantity"
  | "actions";

export const STOCK_IN_FIXED_START_COLUMN_IDS: StockInTableColumnId[] = [
  "checkbox",
];
export const STOCK_IN_FIXED_END_COLUMN_IDS: StockInTableColumnId[] = ["actions"];

const STOCK_IN_DATA_COLUMNS: ConfigurableTableColumn<StockInTableColumnId>[] = [
  {
    id: "movement_date",
    label: "입고일",
    minWidth: 88,
    defaultWidth: 104,
    resizable: true,
  },
  {
    id: "created_time",
    label: "기록 시각",
    minWidth: 72,
    defaultWidth: 88,
    resizable: true,
  },
  {
    id: "modified_by",
    label: "기록자",
    minWidth: 72,
    defaultWidth: 96,
    resizable: true,
  },
  {
    id: "supplier",
    label: "공급처",
    minWidth: 80,
    defaultWidth: 112,
    resizable: true,
  },
  {
    id: "product_name",
    label: "제품명",
    minWidth: 96,
    defaultWidth: 160,
    resizable: true,
  },
  {
    id: "model_name",
    label: "모델명",
    minWidth: 96,
    defaultWidth: 140,
    resizable: true,
  },
  {
    id: "quantity",
    label: "수량",
    minWidth: 56,
    defaultWidth: 72,
    resizable: true,
    align: "right",
  },
];

const STOCK_IN_CHECKBOX_COLUMN: ConfigurableTableColumn<StockInTableColumnId> =
  {
    id: "checkbox",
    label: "",
    minWidth: 40,
    defaultWidth: 40,
    resizable: false,
  };

const STOCK_IN_ACTIONS_COLUMN: ConfigurableTableColumn<StockInTableColumnId> = {
  id: "actions",
  label: "",
  minWidth: 48,
  defaultWidth: 48,
  resizable: false,
  align: "center",
};

export function getStockInTableColumns(canManage: boolean) {
  if (!canManage) return [...STOCK_IN_DATA_COLUMNS];

  return [
    STOCK_IN_CHECKBOX_COLUMN,
    ...STOCK_IN_DATA_COLUMNS,
    STOCK_IN_ACTIONS_COLUMN,
  ];
}

export function getStockInColumnOrderStorageKey(userId: string) {
  return `pc-stock-in-column-order-${userId}`;
}

export function getStockInColumnWidthStorageKey(userId: string) {
  return `pc-stock-in-column-widths-${userId}`;
}
