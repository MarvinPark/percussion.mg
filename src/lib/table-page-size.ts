export const TABLE_PAGE_SIZE = 10;
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 200] as const;

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

export function parseTablePageSize(value: string | number | undefined) {
  const parsed = Number(value);
  if (TABLE_PAGE_SIZE_OPTIONS.includes(parsed as TablePageSize)) {
    return parsed as TablePageSize;
  }
  return TABLE_PAGE_SIZE;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
    totalCount,
  };
}
