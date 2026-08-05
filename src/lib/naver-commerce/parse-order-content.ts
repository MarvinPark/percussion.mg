import type {
  NaverProductOrderContent,
  ParsedSmartstoreOrder,
} from "@/lib/naver-commerce/types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

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

function unwrapOrderContent(raw: NaverProductOrderContent) {
  const root = asRecord(raw);
  const wrapped = asRecord(root.content);

  if (Object.keys(wrapped).length > 0) {
    return {
      productOrder: asRecord(wrapped.productOrder),
      order: asRecord(wrapped.order),
      productOrderId: pickString(root.productOrderId, wrapped.productOrderId),
    };
  }

  return {
    productOrder: asRecord(raw.productOrder ?? root),
    order: asRecord(raw.order),
    productOrderId: pickString(
      raw.productOrderId,
      asRecord(raw.productOrder).productOrderId,
    ),
  };
}

export function parseOrderContent(
  content: NaverProductOrderContent,
): ParsedSmartstoreOrder | null {
  const { productOrder, order, productOrderId } = unwrapOrderContent(content);

  if (!productOrderId) return null;

  const soldAtSource = pickString(
    order.paymentDate,
    order.orderDate,
    productOrder.paymentDate,
    productOrder.placeOrderDate,
    productOrder.decisionDate,
  );
  const soldAt = (soldAtSource || new Date().toISOString()).slice(0, 10);

  const quantity =
    pickNumber(
      productOrder.initialQuantity,
      productOrder.remainQuantity,
      productOrder.quantity,
    ) ?? 1;

  const totalPaymentAmount =
    pickNumber(
      productOrder.initialPaymentAmount,
      productOrder.remainPaymentAmount,
      productOrder.totalPaymentAmount,
      productOrder.initialProductAmount,
      productOrder.remainProductAmount,
      productOrder.totalProductAmount,
    ) ?? 0;

  return {
    productOrderId,
    orderId: pickString(order.orderId),
    soldAt,
    productName:
      pickString(productOrder.productName, productOrder.productOrderName) ||
      "스마트스토어 상품",
    productOption: pickString(
      productOrder.productOption,
      productOrder.optionCode,
      productOrder.productOptionContents,
    ),
    sellerProductCode: pickString(
      productOrder.sellerProductCode,
      productOrder.sellerCustomCode1,
      productOrder.optionManageCode,
      productOrder.productId,
    ),
    quantity: Math.max(1, Math.round(quantity)),
    totalPaymentAmount: Math.max(0, Math.round(totalPaymentAmount)),
    customerName: pickString(order.ordererName),
    customerPhone: pickString(order.ordererTel, order.ordererPhone),
    status: pickString(productOrder.productOrderStatus, productOrder.claimStatus),
  };
}
