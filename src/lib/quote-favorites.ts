import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchQuoteFavoriteIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("quote_favorites")
    .select("quote_id")
    .eq("user_id", userId);

  if (error) {
    if (error.message.includes("quote_favorites")) {
      return [];
    }
    throw error;
  }

  return (data ?? [])
    .map((row) => row.quote_id as string)
    .filter(Boolean);
}
