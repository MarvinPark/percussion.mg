export function getBaseSku(sku: string) {
  return sku.replace(/-\d+$/, "") || sku;
}

export function nextPasteSku(
  originalSku: string,
  existingSkus: Set<string>,
  batchUsed: Map<string, number>,
) {
  const base = getBaseSku(originalSku);
  let n = batchUsed.get(base) ?? 1;

  while (existingSkus.has(`${base}-${n}`)) {
    n++;
  }

  batchUsed.set(base, n + 1);
  return `${base}-${n}`;
}
