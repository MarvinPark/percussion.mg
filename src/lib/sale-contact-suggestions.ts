export type SaleCustomerSuggestion = {
  name: string;
  phone: string;
  address: string;
};

export type SaleContactSuggestions = {
  businessPartners: string[];
  customers: SaleCustomerSuggestion[];
};

type SaleContactRow = {
  business_partner: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
};

export function buildSaleContactSuggestions(
  sales: SaleContactRow[],
): SaleContactSuggestions {
  const businessPartners = new Set<string>();
  const customers = new Map<string, SaleCustomerSuggestion>();

  for (const sale of sales) {
    const businessPartner = sale.business_partner?.trim();
    if (businessPartner) {
      businessPartners.add(businessPartner);
    }

    const customerName = sale.customer_name?.trim();
    if (customerName && !customers.has(customerName)) {
      customers.set(customerName, {
        name: customerName,
        phone: sale.customer_phone?.trim() ?? "",
        address: sale.customer_address?.trim() ?? "",
      });
    }
  }

  const collator = new Intl.Collator("ko");

  return {
    businessPartners: [...businessPartners].sort((a, b) => collator.compare(a, b)),
    customers: [...customers.values()].sort((a, b) =>
      collator.compare(a.name, b.name),
    ),
  };
}
