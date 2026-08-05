import { getNaverCommerceAccessToken } from "@/lib/naver-commerce/auth";
import { getNaverCommerceConfig } from "@/lib/naver-commerce/config";
import { parseOrderContent } from "@/lib/naver-commerce/parse-order-content";
import type {
  NaverProductOrdersResponse,
  ParsedSmartstoreOrder,
} from "@/lib/naver-commerce/types";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MAX_RANGE_MS = 24 * 60 * 60 * 1000 - 1;

function toKstIso(date: Date) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const iso = kst.toISOString().replace("Z", "");
  return `${iso.slice(0, 23)}+09:00`;
}

async function fetchOrdersWindow(
  accessToken: string,
  from: Date,
  to: Date,
) {
  const { apiBase } = getNaverCommerceConfig();
  const collected: ParsedSmartstoreOrder[] = [];
  let page = 1;
  const pageSize = 100;

  while (page <= 20) {
    const params = new URLSearchParams({
      from: toKstIso(from),
      to: toKstIso(to),
      rangeType: "PAYED_DATETIME",
      quantityClaimCompatibility: "true",
      page: String(page),
      pageSize: String(pageSize),
    });

    const response = await fetch(
      `${apiBase}/v1/pay-order/seller/product-orders?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = (await response.json()) as NaverProductOrdersResponse;

    if (!response.ok) {
      throw new Error(data.message ?? `주문 조회 실패 (${response.status})`);
    }

    const contents = data.data?.contents ?? [];
    for (const item of contents) {
      const parsed = parseOrderContent(item);
      if (parsed) collected.push(parsed);
    }

    const totalPages = data.data?.pagination?.totalPages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return collected;
}

function buildWindows(fromDate: string, toDate: string) {
  const start = new Date(`${fromDate}T00:00:00+09:00`);
  const end = new Date(`${toDate}T23:59:59.999+09:00`);
  const nowMinus5s = Date.now() - 5_000;
  const cappedEnd = new Date(Math.min(end.getTime(), nowMinus5s));

  if (start.getTime() > cappedEnd.getTime()) {
    throw new Error("조회 시작일이 종료일보다 늦습니다.");
  }

  const windows: { from: Date; to: Date }[] = [];
  let cursor = start;

  while (cursor.getTime() <= cappedEnd.getTime()) {
    const windowEnd = new Date(
      Math.min(cursor.getTime() + MAX_RANGE_MS, cappedEnd.getTime()),
    );
    windows.push({ from: new Date(cursor), to: windowEnd });
    cursor = new Date(windowEnd.getTime() + 1);
  }

  return windows;
}

export async function fetchSmartstoreOrders(fromDate: string, toDate: string) {
  const accessToken = await getNaverCommerceAccessToken();
  const windows = buildWindows(fromDate, toDate);
  const byId = new Map<string, ParsedSmartstoreOrder>();

  for (const window of windows) {
    const batch = await fetchOrdersWindow(
      accessToken,
      window.from,
      window.to,
    );
    for (const order of batch) {
      byId.set(order.productOrderId, order);
    }
  }

  return [...byId.values()].sort((a, b) =>
    b.soldAt.localeCompare(a.soldAt),
  );
}
