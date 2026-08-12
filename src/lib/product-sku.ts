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

export function nextVariantSku(
  baseSku: string,
  reservedSkus: Set<string>,
  batchCounters?: Map<string, number>,
) {
  let n = batchCounters?.get(baseSku) ?? 1;

  while (reservedSkus.has(`${baseSku}-${n}`)) {
    n += 1;
  }

  batchCounters?.set(baseSku, n + 1);
  return `${baseSku}-${n}`;
}
