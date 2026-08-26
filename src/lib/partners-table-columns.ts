export type PartnersTableColumnId =
  | "display_name"
  | "corp_num"
  | "ceo_name"
  | "phone"
  | "email"
  | "address"
  | "biz_type"
  | "biz_class"
  | "memo"
  | "actions";

export type PartnersTableColumn = {
  id: PartnersTableColumnId;
  label: string;
  align?: "left" | "right";
  minWidth: number;
  defaultWidth: number;
  resizable: boolean;
};

export const PARTNERS_TABLE_COLUMNS: PartnersTableColumn[] = [
  {
    id: "display_name",
    label: "상호",
    minWidth: 120,
    defaultWidth: 180,
    resizable: true,
  },
  {
    id: "corp_num",
    label: "등록번호",
    minWidth: 100,
    defaultWidth: 128,
    resizable: true,
  },
  {
    id: "ceo_name",
    label: "대표자",
    minWidth: 72,
    defaultWidth: 96,
    resizable: true,
  },
  {
    id: "phone",
    label: "전화번호",
    minWidth: 100,
    defaultWidth: 128,
    resizable: true,
  },
  {
    id: "email",
    label: "이메일주소",
    minWidth: 120,
    defaultWidth: 180,
    resizable: true,
  },
  {
    id: "address",
    label: "주소",
    minWidth: 120,
    defaultWidth: 200,
    resizable: true,
  },
  {
    id: "biz_type",
    label: "업태",
    minWidth: 72,
    defaultWidth: 96,
    resizable: true,
  },
  {
    id: "biz_class",
    label: "종목",
    minWidth: 72,
    defaultWidth: 120,
    resizable: true,
  },
  {
    id: "memo",
    label: "메모",
    minWidth: 100,
    defaultWidth: 160,
    resizable: true,
  },
  {
    id: "actions",
    label: "",
    align: "right",
    minWidth: 56,
    defaultWidth: 64,
    resizable: false,
  },
];

export const PARTNERS_FIXED_END_COLUMN_IDS: PartnersTableColumnId[] = ["actions"];

export function getPartnersColumnOrderStorageKey(userId: string) {
  return `pc-partners-column-order-v6-${userId}`;
}

export function getDefaultPartnersColumnOrder(canManage: boolean) {
  return PARTNERS_TABLE_COLUMNS.filter(
    (column) => canManage || column.id !== "actions",
  )
    .map((column) => column.id)
    .filter((columnId) => !PARTNERS_FIXED_END_COLUMN_IDS.includes(columnId));
}

export function getPartnersBaseColumns(canManage: boolean) {
  return canManage
    ? PARTNERS_TABLE_COLUMNS
    : PARTNERS_TABLE_COLUMNS.filter((column) => column.id !== "actions");
}

export function isReorderablePartnersColumn(columnId: PartnersTableColumnId) {
  return !PARTNERS_FIXED_END_COLUMN_IDS.includes(columnId);
}

export function getDefaultPartnersColumnWidths() {
  return Object.fromEntries(
    PARTNERS_TABLE_COLUMNS.map((column) => [column.id, column.defaultWidth]),
  ) as Record<PartnersTableColumnId, number>;
}

export function getPartnersColumnWidthStorageKey(userId: string) {
  return `pc-partners-column-widths-v6-${userId}`;
}

export function loadPartnersColumnWidths(userId: string) {
  const defaults = getDefaultPartnersColumnWidths();

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(getPartnersColumnWidthStorageKey(userId));
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<
      Record<PartnersTableColumnId, number>
    >;
    const merged = { ...defaults };

    for (const column of PARTNERS_TABLE_COLUMNS) {
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

export function savePartnersColumnWidths(
  userId: string,
  widths: Record<PartnersTableColumnId, number>,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getPartnersColumnWidthStorageKey(userId),
    JSON.stringify(widths),
  );
}
