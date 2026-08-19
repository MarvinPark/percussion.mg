export function normalizeTableColumnOrder<T extends string>(
  order: T[],
  defaultOrder: T[],
) {
  const defaultSet = new Set(defaultOrder);
  const normalized: T[] = [];

  for (const columnId of order) {
    if (defaultSet.has(columnId) && !normalized.includes(columnId)) {
      normalized.push(columnId);
    }
  }

  for (const columnId of defaultOrder) {
    if (!normalized.includes(columnId)) {
      normalized.push(columnId);
    }
  }

  return normalized;
}

export function loadTableColumnOrder<T extends string>(
  storageKey: string,
  defaultOrder: T[],
) {
  if (typeof window === "undefined") return defaultOrder;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultOrder;

    const parsed = JSON.parse(raw) as T[];
    if (!Array.isArray(parsed)) return defaultOrder;

    return normalizeTableColumnOrder(parsed, defaultOrder);
  } catch {
    return defaultOrder;
  }
}

export function saveTableColumnOrder<T extends string>(
  storageKey: string,
  order: T[],
  defaultOrder: T[],
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    storageKey,
    JSON.stringify(normalizeTableColumnOrder(order, defaultOrder)),
  );
}

export function applyTableColumnOrder<T extends string, C extends { id: T }>(
  columns: C[],
  order: T[],
  fixedStart: T[] = [],
  fixedEnd: T[] = [],
) {
  const columnMap = new Map(columns.map((column) => [column.id, column]));
  const start = fixedStart
    .map((id) => columnMap.get(id))
    .filter(Boolean) as C[];
  const end = fixedEnd.map((id) => columnMap.get(id)).filter(Boolean) as C[];
  const middle = normalizeTableColumnOrder(
    order,
    columns
      .map((column) => column.id)
      .filter((id) => !fixedStart.includes(id) && !fixedEnd.includes(id)),
  )
    .map((id) => columnMap.get(id))
    .filter(Boolean) as C[];

  return [...start, ...middle, ...end];
}

export function reorderTableColumnOrder<T extends string>(
  order: T[],
  fromId: T,
  toId: T,
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
