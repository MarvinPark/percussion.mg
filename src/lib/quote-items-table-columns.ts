import type { ConfigurableTableColumn } from "@/lib/configurable-table-columns";

export type QuoteItemsTableColumnId =
  | "reorder"
  | "fulfillment"
  | "supplier"
  | "purchase_source"
  | "model_name"
  | "product_name"
  | "quantity"
  | "unit_sale_price"
  | "line_total"
  | "purchase_price"
  | "margin"
  | "margin_rate"
  | "actions";

export const QUOTE_ITEMS_FIXED_START_COLUMN_IDS: QuoteItemsTableColumnId[] = [
  "reorder",
];
export const QUOTE_ITEMS_FIXED_END_COLUMN_IDS: QuoteItemsTableColumnId[] = [
  "actions",
];

export const QUOTE_ITEMS_TABLE_COLUMNS: ConfigurableTableColumn<QuoteItemsTableColumnId>[] =
  [
    {
      id: "reorder",
      label: "",
      minWidth: 32,
      defaultWidth: 32,
      resizable: false,
      align: "center",
    },
    {
      id: "fulfillment",
      label: "출고지",
      minWidth: 72,
      defaultWidth: 88,
      resizable: true,
    },
    {
      id: "supplier",
      label: "공급처",
      minWidth: 80,
      defaultWidth: 104,
      resizable: true,
    },
    {
      id: "purchase_source",
      label: "매입처",
      minWidth: 80,
      defaultWidth: 104,
      resizable: true,
    },
    {
      id: "model_name",
      label: "모델명",
      minWidth: 96,
      defaultWidth: 128,
      resizable: true,
    },
    {
      id: "product_name",
      label: "제품 설명",
      minWidth: 120,
      defaultWidth: 180,
      resizable: true,
    },
    {
      id: "quantity",
      label: "수량",
      minWidth: 56,
      defaultWidth: 72,
      resizable: true,
      align: "center",
    },
    {
      id: "unit_sale_price",
      label: "판매단가",
      minWidth: 88,
      defaultWidth: 112,
      resizable: true,
      align: "right",
    },
    {
      id: "line_total",
      label: "총 판매가",
      minWidth: 88,
      defaultWidth: 112,
      resizable: true,
      align: "right",
    },
    {
      id: "purchase_price",
      label: "매입가",
      minWidth: 88,
      defaultWidth: 112,
      resizable: true,
      align: "right",
    },
    {
      id: "margin",
      label: "마진",
      minWidth: 80,
      defaultWidth: 96,
      resizable: true,
      align: "right",
    },
    {
      id: "margin_rate",
      label: "마진율",
      minWidth: 64,
      defaultWidth: 72,
      resizable: true,
      align: "right",
    },
    {
      id: "actions",
      label: "",
      minWidth: 56,
      defaultWidth: 64,
      resizable: false,
      align: "center",
    },
  ];

export function getQuoteItemsColumnOrderStorageKey(userId: string) {
  return `pc-quote-items-column-order-${userId}`;
}

export function getQuoteItemsColumnWidthStorageKey(userId: string) {
  return `pc-quote-items-column-widths-${userId}`;
}
