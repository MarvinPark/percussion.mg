import type { SaleWithProduct } from "@/types/sale";

export const SALES_SECTION_ONLINE = "온라인";
export const SALES_SECTION_WHOLESALE = "도매";
export const SALES_SECTION_OTHER_LABEL = "그외";

export type SalesSectionId = "online" | "wholesale" | "other";

export type SalesCategorySection = {
  id: SalesSectionId;
  label: string;
  sales: SaleWithProduct[];
};

export function isPrimarySalesSectionCategory(category: string | null | undefined) {
  const normalized = category?.trim() ?? "";
  return (
    normalized === SALES_SECTION_ONLINE || normalized === SALES_SECTION_WHOLESALE
  );
}

/** 그외 섹션에서 선택 가능한 구분 목록 */
export function getOtherSectionCategoryOptions(
  sales: SaleWithProduct[],
): string[] {
  const categories = new Set<string>();

  for (const sale of sales) {
    const category = sale.sale_category?.trim() ?? "";
    if (!category || isPrimarySalesSectionCategory(category)) continue;
    categories.add(category);
  }

  return [...categories].sort((a, b) => a.localeCompare(b, "ko"));
}

export function filterOtherSectionSalesByCategory(
  sales: SaleWithProduct[],
  categoryFilter: string,
) {
  const selected = categoryFilter.trim();
  if (!selected) return sales;

  return sales.filter((sale) => (sale.sale_category?.trim() ?? "") === selected);
}

export function groupSalesByCategorySection(
  sales: SaleWithProduct[],
): SalesCategorySection[] {
  const online: SaleWithProduct[] = [];
  const wholesale: SaleWithProduct[] = [];
  const other: SaleWithProduct[] = [];

  for (const sale of sales) {
    const category = sale.sale_category?.trim() ?? "";
    if (category === SALES_SECTION_ONLINE) {
      online.push(sale);
    } else if (category === SALES_SECTION_WHOLESALE) {
      wholesale.push(sale);
    } else {
      other.push(sale);
    }
  }

  return [
    { id: "online", label: SALES_SECTION_ONLINE, sales: online },
    { id: "wholesale", label: SALES_SECTION_WHOLESALE, sales: wholesale },
    { id: "other", label: SALES_SECTION_OTHER_LABEL, sales: other },
  ];
}
