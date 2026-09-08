"use server";

import { requirePermission } from "@/lib/profile";
import {
  fetchProductSalesBuckets,
  type SalesPeriodGranularity,
  type SalesProductPeriodBucket,
} from "@/lib/sales-analytics";
import { createClient } from "@/lib/supabase/server";

/**
 * 제품별 판매 추이를 필요할 때만 조회합니다.
 *
 * 대시보드는 제품을 선택하기 전까지 이 차트에 아무것도 그리지 않으므로,
 * 초기 로드에 전체 매출 데이터를 실어 보내는 대신 선택 시점에 해당
 * 제품·기간만 가져옵니다.
 */
export async function loadProductSalesTrend(input: {
  productId: string;
  granularity: SalesPeriodGranularity;
  start: string;
  end: string;
}): Promise<{ buckets: SalesProductPeriodBucket[]; error: string | null }> {
  const auth = await requirePermission("viewSales");
  if ("error" in auth) {
    return { buckets: [], error: auth.error ?? "이 작업을 할 권한이 없습니다." };
  }

  const supabase = await createClient();

  return fetchProductSalesBuckets(
    supabase,
    input.productId,
    input.granularity,
    input.start,
    input.end,
  );
}
