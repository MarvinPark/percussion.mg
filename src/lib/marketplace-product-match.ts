export type ProductMatchCandidate = {
  id: string;
  sku: string;
  product_name: string;
  model_name: string;
  brand?: string | null;
  purchase_price: number;
  sale_price: number;
};

export function matchProductForMarketplaceOrder(
  products: ProductMatchCandidate[],
  order: {
    sellerProductCode: string;
    productName: string;
    productOption: string;
  },
) {
  const code = order.sellerProductCode.trim().toLowerCase();
  if (code) {
    const bySku = products.find((p) => p.sku.trim().toLowerCase() === code);
    if (bySku) return bySku;
  }

  const haystack = `${order.productName} ${order.productOption}`.trim().toLowerCase();
  if (!haystack) return null;

  const exactName = products.find(
    (p) => p.product_name.trim().toLowerCase() === order.productName.trim().toLowerCase(),
  );
  if (exactName) return exactName;

  const includesMatch = products.find((p) => {
    const name = p.product_name.trim().toLowerCase();
    const model = p.model_name.trim().toLowerCase();
    return (name && haystack.includes(name)) || (model && haystack.includes(model));
  });
  if (includesMatch) return includesMatch;

  return (
    products.find((p) => {
      const name = p.product_name.trim().toLowerCase();
      return name.length >= 3 && haystack.includes(name);
    }) ?? null
  );
}
