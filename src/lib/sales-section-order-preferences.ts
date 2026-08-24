import {
  SALES_SECTION_ONLINE,
  SALES_SECTION_OTHER_LABEL,
  SALES_SECTION_WHOLESALE,
  type SalesSectionId,
} from "@/lib/sales-category-sections";

export type { SalesSectionId };

export const DEFAULT_SALES_SECTION_ORDER: SalesSectionId[] = [
  "online",
  "wholesale",
  "other",
];

export const SALES_SECTION_LABELS: Record<SalesSectionId, string> = {
  online: SALES_SECTION_ONLINE,
  wholesale: SALES_SECTION_WHOLESALE,
  other: SALES_SECTION_OTHER_LABEL,
};

const VALID_SECTION_IDS = new Set<SalesSectionId>(
  DEFAULT_SALES_SECTION_ORDER,
);

export function getSalesSectionOrderStorageKey(userId: string) {
  return `pc-sales-section-order-${userId}`;
}

export function normalizeSalesSectionOrder(
  order: unknown,
): SalesSectionId[] {
  if (!Array.isArray(order)) return [...DEFAULT_SALES_SECTION_ORDER];

  const normalized = order.filter(
    (id): id is SalesSectionId =>
      typeof id === "string" && VALID_SECTION_IDS.has(id as SalesSectionId),
  );

  for (const id of DEFAULT_SALES_SECTION_ORDER) {
    if (!normalized.includes(id)) {
      normalized.push(id);
    }
  }

  return normalized.slice(0, DEFAULT_SALES_SECTION_ORDER.length);
}

export function loadSalesSectionOrder(userId: string): SalesSectionId[] {
  if (typeof window === "undefined") return [...DEFAULT_SALES_SECTION_ORDER];

  try {
    const raw = localStorage.getItem(getSalesSectionOrderStorageKey(userId));
    if (!raw) return [...DEFAULT_SALES_SECTION_ORDER];
    return normalizeSalesSectionOrder(JSON.parse(raw));
  } catch {
    return [...DEFAULT_SALES_SECTION_ORDER];
  }
}

export function saveSalesSectionOrder(
  userId: string,
  order: SalesSectionId[],
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getSalesSectionOrderStorageKey(userId),
    JSON.stringify(normalizeSalesSectionOrder(order)),
  );
}

export function sortSalesSections<T extends { id: SalesSectionId }>(
  sections: T[],
  order: SalesSectionId[],
): T[] {
  const orderMap = new Map(order.map((id, index) => [id, index]));
  return [...sections].sort(
    (a, b) =>
      (orderMap.get(a.id) ?? DEFAULT_SALES_SECTION_ORDER.length) -
      (orderMap.get(b.id) ?? DEFAULT_SALES_SECTION_ORDER.length),
  );
}

export function moveSalesSection(
  order: SalesSectionId[],
  sectionId: SalesSectionId,
  direction: "up" | "down",
): SalesSectionId[] | null {
  const index = order.indexOf(sectionId);
  if (index === -1) return null;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= order.length) return null;

  const next = [...order];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
