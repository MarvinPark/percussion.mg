import { getEsmCommerceAccessToken } from "@/lib/esm-commerce/auth";
import { getEsmCommerceConfig } from "@/lib/esm-commerce/config";
import { parseGmarketOrder } from "@/lib/esm-commerce/parse-order";
import type {
  EsmRequestOrdersResponse,
  ParsedGmarketOrder,
} from "@/lib/esm-commerce/types";

const RATE_LIMIT_MS = 5_100;
const ORDER_STATUSES = [1, 2, 3, 4, 5] as const;
const PAGE_SIZE = 100;

let lastRequestAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRateLimit() {
  const now = Date.now();
  const waitMs = Math.max(0, lastRequestAt + RATE_LIMIT_MS - now);
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  lastRequestAt = Date.now();
}

function unwrapResponseData(response: EsmRequestOrdersResponse) {
  return response.Data ?? response.data ?? null;
}

async function fetchOrdersPage(
  accessToken: string,
  input: {
    orderStatus: number;
    requestDateFrom: string;
    requestDateTo: string;
    pageIndex: number;
  },
) {
  const { apiBase, siteType } = getEsmCommerceConfig();

  await waitForRateLimit();

  const response = await fetch(
    `${apiBase}/shipping/v1/Order/RequestOrders`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        siteType,
        orderStatus: input.orderStatus,
        requestDateType: 2,
        requestDateFrom: input.requestDateFrom,
        requestDateTo: input.requestDateTo,
        pageIndex: input.pageIndex,
        pageSize: PAGE_SIZE,
      }),
    },
  );

  const data = (await response.json()) as EsmRequestOrdersResponse;

  if (!response.ok) {
    throw new Error(data.Message ?? `지마켓 주문 조회 실패 (${response.status})`);
  }

  if ((data.ResultCode ?? 0) !== 0) {
    const message = data.Message ?? "지마켓 주문 조회에 실패했습니다.";
    if (message.includes("5초당 1회")) {
      lastRequestAt = Date.now();
      await sleep(RATE_LIMIT_MS);
      return fetchOrdersPage(accessToken, input);
    }
    throw new Error(message);
  }

  return unwrapResponseData(data);
}

async function fetchOrdersForStatus(
  accessToken: string,
  orderStatus: number,
  fromDate: string,
  toDate: string,
) {
  const collected: ParsedGmarketOrder[] = [];
  let pageIndex = 1;
  let totalCount = 0;

  while (pageIndex <= 50) {
    const data = await fetchOrdersPage(accessToken, {
      orderStatus,
      requestDateFrom: fromDate,
      requestDateTo: toDate,
      pageIndex,
    });

    const orders = data?.RequestOrders ?? [];
    totalCount = data?.TotalCount ?? orders.length;

    for (const order of orders) {
      const parsed = parseGmarketOrder(order);
      if (parsed) collected.push(parsed);
    }

    if (orders.length < PAGE_SIZE) break;
    if (pageIndex * PAGE_SIZE >= totalCount) break;
    pageIndex += 1;
  }

  return collected;
}

export async function fetchGmarketOrders(fromDate: string, toDate: string) {
  const accessToken = getEsmCommerceAccessToken();
  const byId = new Map<string, ParsedGmarketOrder>();

  for (const orderStatus of ORDER_STATUSES) {
    const batch = await fetchOrdersForStatus(
      accessToken,
      orderStatus,
      fromDate,
      toDate,
    );

    for (const order of batch) {
      byId.set(order.orderLineId, order);
    }
  }

  return [...byId.values()].sort((a, b) => b.soldAt.localeCompare(a.soldAt));
}
