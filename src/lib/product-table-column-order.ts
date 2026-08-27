import {
  PRODUCT_TABLE_COLUMNS,
  type ProductTableColumn,
  type ProductTableColumnId,
} from "@/lib/product-table-columns";

export const FIXED_START_COLUMN_IDS: ProductTableColumnId[] = [
  "checkbox",
  "key_stock",
];

export const FIXED_END_COLUMN_IDS: ProductTableColumnId[] = ["actions"];

export function isReorderableProductColumn(columnId: ProductTableColumnId) {
  return (
    !FIXED_START_COLUMN_IDS.includes(columnId) &&
    !FIXED_END_COLUMN_IDS.includes(columnId)
  );
}

export function getReorderableColumnIds(
  columns: ProductTableColumn[] = PRODUCT_TABLE_COLUMNS,
) {
  return columns
    .map((column) => column.id)
    .filter((columnId) => isReorderableProductColumn(columnId));
}

export function getColumnOrderStorageKey(userId: string) {
  return `pc-product-column-order-v2-${userId}`;
}

export function getDefaultColumnOrder(
  columns: ProductTableColumn[] = PRODUCT_TABLE_COLUMNS,
) {
  return getReorderableColumnIds(columns);
}

export function normalizeColumnOrder(
  order: ProductTableColumnId[],
  columns: ProductTableColumn[] = PRODUCT_TABLE_COLUMNS,
) {
  const reorderableIds = getReorderableColumnIds(columns);
  const reorderableSet = new Set(reorderableIds);
  const normalized: ProductTableColumnId[] = [];

  for (const columnId of order) {
    if (reorderableSet.has(columnId) && !normalized.includes(columnId)) {
      normalized.push(columnId);
    }
  }

  for (const columnId of reorderableIds) {
    if (!normalized.includes(columnId)) {
      normalized.push(columnId);
    }
  }

  return normalized;
}

export function loadColumnOrder(
  userId: string,
  columns: ProductTableColumn[] = PRODUCT_TABLE_COLUMNS,
) {
  const defaults = getDefaultColumnOrder(columns);

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(getColumnOrderStorageKey(userId));
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as ProductTableColumnId[];
    if (!Array.isArray(parsed)) return defaults;

    return normalizeColumnOrder(parsed, columns);
  } catch {
    return defaults;
  }
}

export function saveColumnOrder(
  userId: string,
  order: ProductTableColumnId[],
  columns: ProductTableColumn[] = PRODUCT_TABLE_COLUMNS,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getColumnOrderStorageKey(userId),
    JSON.stringify(normalizeColumnOrder(order, columns)),
  );
}

export function applyColumnOrder(
  columns: ProductTableColumn[],
  order: ProductTableColumnId[],
) {
  const columnMap = new Map(columns.map((column) => [column.id, column]));
  const fixedStart = FIXED_START_COLUMN_IDS.map((id) => columnMap.get(id)).filter(
    Boolean,
  ) as ProductTableColumn[];
  const fixedEnd = FIXED_END_COLUMN_IDS.map((id) => columnMap.get(id)).filter(
    Boolean,
  ) as ProductTableColumn[];
  const middle = normalizeColumnOrder(order, columns)
    .map((id) => columnMap.get(id))
    .filter(Boolean) as ProductTableColumn[];

  return [...fixedStart, ...middle, ...fixedEnd];
}

export function reorderColumnOrder(
  order: ProductTableColumnId[],
  fromId: ProductTableColumnId,
  toId: ProductTableColumnId,
) {
  if (fromId === toId) return order;

  const next = [...order];
  const fromIndex = next.indexOf(fromId);
  const toIndex = next.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1) return order;

  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, fromId);
  return next;
}
