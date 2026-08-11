import type { ProductInlineField } from "@/app/(main)/products/actions";

export const TABLE_FIELD_ORDER: ProductInlineField[] = [
  "supplier",
  "category",
  "brand",
  "product_name",
  "model_name",
  "sku",
  "stock_floor3",
  "stock_b1",
  "stock_display",
  "stock_quantity",
  "purchase_price",
  "sale_price",
];

export type TableFocusTarget =
  | { kind: "field"; productId: string; field: ProductInlineField }
  | { kind: "edit"; productId: string }
  | { kind: "delete"; productId: string }
  | { kind: "checkbox"; productId: string };

export type TableFocusState = TableFocusTarget & {
  editing?: boolean;
};

function rowIndex(products: { id: string }[], productId: string) {
  return products.findIndex((product) => product.id === productId);
}

export function isSameFocus(a: TableFocusState | null, b: TableFocusState | null) {
  if (!a || !b) return false;
  if (a.kind !== b.kind || a.productId !== b.productId) return false;
  if (a.kind === "field" && b.kind === "field") return a.field === b.field;
  return true;
}

export function getNextTableFocus(
  current: TableFocusState,
  products: { id: string }[],
  direction: "forward" | "backward",
): TableFocusState | null {
  const idx = rowIndex(products, current.productId);
  if (idx === -1) return null;

  if (direction === "forward") {
    if (current.kind === "field") {
      const fieldIdx = TABLE_FIELD_ORDER.indexOf(current.field);
      if (fieldIdx < TABLE_FIELD_ORDER.length - 1) {
        return {
          kind: "field",
          productId: current.productId,
          field: TABLE_FIELD_ORDER[fieldIdx + 1],
          editing: true,
        };
      }
      return { kind: "edit", productId: current.productId };
    }

    if (current.kind === "edit") {
      return { kind: "delete", productId: current.productId };
    }

    if (current.kind === "delete") {
      if (idx + 1 < products.length) {
        return { kind: "checkbox", productId: products[idx + 1].id };
      }
      return null;
    }

    if (current.kind === "checkbox") {
      return {
        kind: "field",
        productId: current.productId,
        field: "supplier",
        editing: true,
      };
    }
  } else {
    if (current.kind === "field") {
      const fieldIdx = TABLE_FIELD_ORDER.indexOf(current.field);
      if (fieldIdx > 0) {
        return {
          kind: "field",
          productId: current.productId,
          field: TABLE_FIELD_ORDER[fieldIdx - 1],
          editing: true,
        };
      }
      return { kind: "checkbox", productId: current.productId };
    }

    if (current.kind === "checkbox") {
      if (idx > 0) {
        return { kind: "delete", productId: products[idx - 1].id };
      }
      return null;
    }

    if (current.kind === "delete") {
      return { kind: "edit", productId: current.productId };
    }

    if (current.kind === "edit") {
      return {
        kind: "field",
        productId: current.productId,
        field: TABLE_FIELD_ORDER[TABLE_FIELD_ORDER.length - 1],
        editing: true,
      };
    }
  }

  return null;
}

export const tableFocusRingClass =
  "ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900";
