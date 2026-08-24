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
