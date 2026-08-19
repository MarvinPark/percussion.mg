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

const CANCELLED_ORDER_STATUSES = new Set(["CANCELED", "CANCELLED", "RETURNED"]);

function normalizeStatus(value: string) {
  return value.trim().toUpperCase();
}

function isCancelledSmartstoreOrder(input: {
  productOrderStatus: string;
  claimStatus: string;
  remainQuantity: number | null;
  quantity: number;
  totalPaymentAmount: number;
}) {
  const productOrderStatus = normalizeStatus(input.productOrderStatus);
  const claimStatus = normalizeStatus(input.claimStatus);

  if (CANCELLED_ORDER_STATUSES.has(productOrderStatus)) {
    return true;
  }

  if (input.remainQuantity !== null && input.remainQuantity <= 0) {
    return true;
  }

  if (input.quantity <= 0 || input.totalPaymentAmount <= 0) {
    return true;
  }

  if (
    claimStatus === "CANCEL_DONE" &&
    input.remainQuantity !== null &&
    input.remainQuantity <= 0
  ) {
    return true;
  }

  return false;
}

export function parseOrderContent(
  content: NaverProductOrderContent,
): ParsedSmartstoreOrder | null {
  const { productOrder, order, productOrderId } = unwrapOrderContent(content);

  if (!productOrderId) return null;

  const productOrderStatus = pickString(productOrder.productOrderStatus);
  const claimStatus = pickString(productOrder.claimStatus);

  const soldAtSource = pickString(
    order.paymentDate,
    order.orderDate,
    productOrder.paymentDate,
    productOrder.placeOrderDate,
    productOrder.decisionDate,
  );
  const soldAt = (soldAtSource || new Date().toISOString()).slice(0, 10);

  const remainQuantity = pickNumber(productOrder.remainQuantity);
  const initialQuantity =
    pickNumber(productOrder.initialQuantity, productOrder.quantity) ?? 1;
  const quantity = Math.max(0, Math.round(remainQuantity ?? initialQuantity));

  const totalPaymentAmount =
    pickNumber(
      productOrder.remainPaymentAmount,
      productOrder.remainProductAmount,
      productOrder.initialPaymentAmount,
      productOrder.totalPaymentAmount,
      productOrder.initialProductAmount,
      productOrder.totalProductAmount,
    ) ?? 0;

  if (
    isCancelledSmartstoreOrder({
      productOrderStatus,
      claimStatus,
      remainQuantity,
      quantity,
      totalPaymentAmount: Math.max(0, Math.round(totalPaymentAmount)),
    })
  ) {
    return null;
  }

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
    quantity: Math.max(1, quantity),
    totalPaymentAmount: Math.max(0, Math.round(totalPaymentAmount)),
    customerName: pickString(order.ordererName),
    customerPhone: pickString(order.ordererTel, order.ordererPhone),
    status: productOrderStatus || claimStatus,
  };
}
