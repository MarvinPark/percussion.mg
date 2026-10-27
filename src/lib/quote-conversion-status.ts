import type { SupabaseClient } from "@supabase/supabase-js";

const QUOTE_ID_CHUNK_SIZE = 200;

/** sales.quote_id 기준 — 목록에 있는 견적 중 매출전환된 ID (한 건이라도 매출이 있으면 포함). */
export async function fetchConvertedQuoteIds(
  supabase: SupabaseClient,
  quoteIds: string[],
): Promise<{ ids: string[]; error: string | null }> {
  const uniqueQuoteIds = [...new Set(quoteIds.filter(Boolean))];
  if (uniqueQuoteIds.length === 0) {
    return { ids: [], error: null };
  }

  const converted = new Set<string>();

  for (let offset = 0; offset < uniqueQuoteIds.length; offset += QUOTE_ID_CHUNK_SIZE) {
    const chunk = uniqueQuoteIds.slice(offset, offset + QUOTE_ID_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("sales")
      .select("quote_id")
      .in("quote_id", chunk);

    if (error) {
      if (error.message?.includes("quote_id")) {
        return {
          ids: [],
          error:
            "sales 테이블에 quote_id 컬럼이 없습니다. supabase/schema-quotes-conversion.sql을 실행해 주세요.",
        };
      }
      return { ids: [], error: "매출전환 견적 목록을 불러오지 못했습니다." };
    }

    for (const row of data ?? []) {
      const id = row.quote_id;
      if (typeof id === "string" && id.length > 0) {
        converted.add(id);
      }
    }
  }

  return { ids: [...converted], error: null };
}
