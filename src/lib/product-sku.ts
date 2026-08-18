export function getBaseSku(sku: string) {
  const normalized = sku.trim();
  return normalized.replace(/-\d+$/, "") || normalized;
}

export function belongsToSkuFamily(baseSku: string, sku: string) {
  const normalized = sku.trim();
  if (normalized === baseSku) return true;

  if (!normalized.startsWith(`${baseSku}-`)) return false;

  const suffix = normalized.slice(baseSku.length);
  return /^-\d+$/.test(suffix);
}

/** 원본 SKU 뒤에 -1, -2… 접미사를 붙입니다. (예: FGDP-30 → FGDP-30-1) */
export function nextVariantSku(
  sourceSku: string,
  reservedSkus: Set<string>,
  batchCounters?: Map<string, number>,
) {
  const key = sourceSku.trim();
  let n = batchCounters?.get(key) ?? 1;

  while (reservedSkus.has(`${key}-${n}`)) {
    n += 1;
  }

  batchCounters?.set(key, n + 1);
  return `${key}-${n}`;
}
