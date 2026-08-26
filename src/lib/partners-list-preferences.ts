import {
  parseTablePageSize,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";

export function getPartnersPageSizeStorageKey(userId: string) {
  return `pc-partners-page-size-${userId}`;
}

export function loadPartnersPageSize(userId: string): TablePageSize {
  if (typeof window === "undefined") return TABLE_PAGE_SIZE;

  try {
    const raw = localStorage.getItem(getPartnersPageSizeStorageKey(userId));
    if (!raw) return TABLE_PAGE_SIZE;
    return parseTablePageSize(raw);
  } catch {
    return TABLE_PAGE_SIZE;
  }
}

export function savePartnersPageSize(userId: string, pageSize: TablePageSize) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getPartnersPageSizeStorageKey(userId), String(pageSize));
}

export function getPartnersEmphasizedIdsStorageKey(userId: string) {
  return `pc-partners-emphasized-${userId}`;
}

export function loadPartnersEmphasizedIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = localStorage.getItem(getPartnersEmphasizedIdsStorageKey(userId));
    if (!raw) return new Set();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function savePartnersEmphasizedIds(userId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getPartnersEmphasizedIdsStorageKey(userId),
    JSON.stringify([...ids]),
  );
}
