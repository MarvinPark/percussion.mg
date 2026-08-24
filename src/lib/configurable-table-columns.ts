export type ConfigurableTableColumn<T extends string> = {
  id: T;
  label: string;
  minWidth: number;
  defaultWidth: number;
  resizable: boolean;
  align?: "left" | "center" | "right";
};

export function getDefaultWidthsFromColumns<T extends string>(
  columns: ConfigurableTableColumn<T>[],
) {
  return Object.fromEntries(
    columns.map((column) => [column.id, column.defaultWidth]),
  ) as Record<T, number>;
}

export function loadTableColumnWidths<T extends string>(
  storageKey: string,
  columns: ConfigurableTableColumn<T>[],
) {
  const defaults = getDefaultWidthsFromColumns(columns);

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<Record<T, number>>;
    const merged = { ...defaults };

    for (const column of columns) {
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

export function saveTableColumnWidths<T extends string>(
  storageKey: string,
  widths: Record<T, number>,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(widths));
}

export function isReorderableConfigurableColumn<T extends string>(
  columnId: T,
  fixedStart: T[] = [],
  fixedEnd: T[] = [],
) {
  return !fixedStart.includes(columnId) && !fixedEnd.includes(columnId);
}
