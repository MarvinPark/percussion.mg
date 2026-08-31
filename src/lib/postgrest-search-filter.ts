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
