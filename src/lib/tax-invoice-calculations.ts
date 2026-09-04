export type TaxInvoiceDetailLine = {
  serialNum: number;
  purchaseDT: string;
  itemName: string;
  spec?: string;
  qty: string;
  unitCost: string;
  supplyCost: string;
  tax: string;
  remark?: string;
};

export function splitVatInclusive(totalAmount: number) {
  const total = Math.max(0, Math.round(totalAmount));
  const supplyCost = Math.round(total / 1.1);
  const tax = total - supplyCost;
  return { supplyCost, tax, totalAmount: total };
}

export function buildDetailListFromItemNames(
  itemNames: string[],
  totalAmount: number,
  purchaseDate: string,
): TaxInvoiceDetailLine[] {
  const names = itemNames.map((name) => name.trim()).filter(Boolean);
  const resolvedNames = names.length > 0 ? names : ["악기"];
  const { supplyCost: totalSupply, tax: totalTax } = splitVatInclusive(totalAmount);
  const count = resolvedNames.length;
  let supplyRemaining = totalSupply;
  let taxRemaining = totalTax;

  return resolvedNames.map((itemName, index) => {
    const isLast = index === count - 1;
    const supply = isLast ? supplyRemaining : Math.round(totalSupply / count);
    const tax = isLast ? taxRemaining : Math.round(totalTax / count);
    supplyRemaining -= supply;
    taxRemaining -= tax;

    return {
      serialNum: index + 1,
      purchaseDT: purchaseDate,
      itemName,
      qty: "1",
      unitCost: String(supply),
      supplyCost: String(supply),
      tax: String(tax),
    };
  });
}

export function detailListToStoredItems(detailList: TaxInvoiceDetailLine[]) {
  return detailList.map((item) => ({
    name: item.itemName,
    supply_cost: Number(item.supplyCost) || 0,
    tax_amount: Number(item.tax) || 0,
  }));
}
