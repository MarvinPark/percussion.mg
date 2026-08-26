import type { QuoteItemInput } from "@/types/quote";

type SaleLineDraftLike = {
  productId: string;
  quantity: number;
  unitSalePrice: number;
  unitPurchasePrice: number;
  shippingCost: number;
};

export function isSaleFormDirty(input: {
  businessPartner: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note: string;
  lines: SaleLineDraftLike[];
}): boolean {
  if (
    input.businessPartner.trim() ||
    input.customerName.trim() ||
    input.customerPhone.trim() ||
    input.customerAddress.trim() ||
    input.note.trim()
  ) {
    return true;
  }

  if (input.lines.length > 1) return true;

  return input.lines.some(
    (line) =>
      line.productId ||
      line.quantity !== 1 ||
      line.unitSalePrice > 0 ||
      line.unitPurchasePrice > 0 ||
      line.shippingCost > 0,
  );
}

export function isQuoteFormDirty(input: {
  items: QuoteItemInput[];
  quoteDate: string;
  saleCategory: string;
  editableManagerName: string;
  customerName: string;
  businessPartner: string;
  partnerId: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  customerNote: string;
  memo: string;
  paymentMethodId: string;
  initialSnapshot?: string | null;
}): boolean {
  const currentSnapshot = JSON.stringify({
    items: input.items,
    quoteDate: input.quoteDate,
    saleCategory: input.saleCategory,
    editableManagerName: input.editableManagerName,
    customerName: input.customerName,
    businessPartner: input.businessPartner,
    partnerId: input.partnerId,
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress,
    customerEmail: input.customerEmail,
    customerNote: input.customerNote,
    memo: input.memo,
    paymentMethodId: input.paymentMethodId,
  });

  if (input.initialSnapshot) {
    return currentSnapshot !== input.initialSnapshot;
  }

  if (input.items.length > 0) return true;

  return Boolean(
    input.customerName.trim() ||
      input.businessPartner.trim() ||
      input.customerPhone.trim() ||
      input.customerAddress.trim() ||
      input.customerEmail.trim() ||
      input.customerNote.trim() ||
      input.memo.trim(),
  );
}
