import type {
  EsmItemOption,
  EsmRequestOrder,
  ParsedGmarketOrder,
} from "@/lib/esm-commerce/types";

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatOptionList(options: EsmItemOption[] | null | undefined) {
  if (!options?.length) return "";

  return options
    .map((option) => pickString(option.ItemOptionValue))
    .filter(Boolean)
    .join(" / ");
}

export function parseGmarketOrder(
  order: EsmRequestOrder,
): ParsedGmarketOrder | null {
  const orderNo = pickString(order.OrderNo);
  if (!orderNo) return null;

  const soldAtSource = pickString(order.PayDate, order.OrderDate);
  const soldAt = (soldAtSource || new Date().toISOString()).slice(0, 10);
  const quantity = Math.max(1, Math.round(pickNumber(order.ContrAmount) ?? 1));
  const totalPaymentAmount = Math.max(
    0,
    Math.round(
      pickNumber(order.OrderAmount, order.AcntMoney, order.SalePrice) ?? 0,
    ),
  );
  const selectOption = formatOptionList(order.ItemOptionSelectList);
  const additionOption = formatOptionList(order.ItemOptionAdditionList);
  const productOption = [selectOption, additionOption].filter(Boolean).join(" · ");

  return {
    orderLineId: orderNo,
    orderNo,
    payNo: pickString(order.PayNo),
    soldAt,
    productName: pickString(order.GoodsName) || "지마켓 상품",
    productOption,
    sellerProductCode: pickString(order.OutGoodsNo, order.SKUNo, order.SiteGoodsNo),
    quantity,
    totalPaymentAmount,
    serviceFee: Math.max(0, Math.round(pickNumber(order.ServiceFee) ?? 0)),
    customerName: pickString(order.BuyerName, order.ReceiverName),
    customerPhone: pickString(order.BuyerMobileTel, order.HpNo),
    customerAddress: pickString(order.DelFullAddress),
    orderStatus: pickNumber(order.OrderStatus),
  };
}
