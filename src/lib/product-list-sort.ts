import type { ProductTableColumnId } from "@/lib/product-table-columns";

export const PRODUCT_SORTABLE_COLUMNS = [
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
] as const;

export type ProductSortColumn = (typeof PRODUCT_SORTABLE_COLUMNS)[number];

export type ProductSortDirection = "asc" | "desc";

export type ProductListSort = {
  column: ProductSortColumn | null;
  direction: ProductSortDirection;
};

export const DEFAULT_PRODUCT_LIST_SORT: ProductListSort = {
  column: null,
  direction: "desc",
};

const SORTABLE_COLUMN_SET = new Set<string>(PRODUCT_SORTABLE_COLUMNS);

export function isProductSortColumn(
  value: string | undefined,
): value is ProductSortColumn {
  return Boolean(value && SORTABLE_COLUMN_SET.has(value));
}

export function parseProductListSort(
  sortParam: string | undefined,
  orderParam: string | undefined,
): ProductListSort {
  if (!isProductSortColumn(sortParam)) {
    return DEFAULT_PRODUCT_LIST_SORT;
  }

  return {
    column: sortParam,
    direction: orderParam === "asc" ? "asc" : "desc",
  };
}

export function isSortableProductColumn(
  columnId: ProductTableColumnId,
): columnId is ProductSortColumn {
  return SORTABLE_COLUMN_SET.has(columnId);
}

/** 내림차순 → 올림차순 → 등록순(기본) */
export function cycleProductListSort(
  current: ProductListSort,
  column: ProductSortColumn,
): ProductListSort {
  if (current.column !== column) {
    return { column, direction: "desc" };
  }

  if (current.direction === "desc") {
    return { column, direction: "asc" };
  }

  return DEFAULT_PRODUCT_LIST_SORT;
}

export function getSortDirectionForColumn(
  sort: ProductListSort,
  column: ProductSortColumn,
): ProductSortDirection | null {
  if (sort.column !== column) return null;
  return sort.direction;
}

export function formatProductListSortLabel(
  direction: ProductSortDirection | null,
): string {
  if (direction === "desc") return "내림차순";
  if (direction === "asc") return "올림차순";
  return "등록순";
}

export function productListSortToSearchParams(
  sort: ProductListSort,
): { sort?: string; order?: string } {
  if (!sort.column) {
    return {};
  }

  return {
    sort: sort.column,
    order: sort.direction,
  };
}
