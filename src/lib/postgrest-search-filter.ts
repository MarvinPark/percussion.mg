export const PRODUCT_SEARCH_MIN_LENGTH = 2;

export function normalizeProductSearchQuery(raw: string): {
  searchQuery: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { searchQuery: "" };
  }
  if (trimmed.length < PRODUCT_SEARCH_MIN_LENGTH) {
    return {
      searchQuery: trimmed,
      error: `검색어는 ${PRODUCT_SEARCH_MIN_LENGTH}자 이상 입력해 주세요.`,
    };
  }
  return { searchQuery: trimmed };
}

export function isProductSearchQueryReady(raw: string) {
  const trimmed = raw.trim();
  return trimmed.length === 0 || trimmed.length >= PRODUCT_SEARCH_MIN_LENGTH;
}

/** PostgREST ilike 패턴용 — SQL 와ildcard `%` 대신 `*` 사용(URL에서 `%c` 등이 깨지는 문제 방지). */
export function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function escapePostgrestQuotedValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** PostgREST `.or("col.ilike.<pattern>")` 필터 값 생성 */
export function toPostgrestIlikePattern(searchQuery: string) {
  const core = escapeIlike(searchQuery.trim());
  const pattern = `*${core}*`;

  if (/[,\.:()"\\]/.test(pattern)) {
    return `"${escapePostgrestQuotedValue(pattern)}"`;
  }

  return pattern;
}

export function buildProductSearchOrFilter(searchQuery: string) {
  const pattern = toPostgrestIlikePattern(searchQuery);

  return [
    `supplier.ilike.${pattern}`,
    `category.ilike.${pattern}`,
    `brand.ilike.${pattern}`,
    `product_name.ilike.${pattern}`,
    `model_name.ilike.${pattern}`,
    `sku.ilike.${pattern}`,
    `keywords.ilike.${pattern}`,
  ].join(",");
}
