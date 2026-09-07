import type { SupabaseClient } from "@supabase/supabase-js";

function sumInventoryAssetFromRows(
  rows: { purchase_price: number | null; stock_quantity: number | null }[],
) {
  return Math.round(
    rows.reduce(
      (sum, row) =>
        sum + (Number(row.purchase_price) || 0) * (Number(row.stock_quantity) || 0),
      0,
    ),
  );
}

export async function fetchTotalInventoryAsset(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("get_total_inventory_asset");

  if (!error && data != null) {
    return Math.round(Number(data) || 0);
  }

  const { data: rows, error: selectError } = await supabase
    .from("products")
    .select("purchase_price, stock_quantity");

  if (selectError || !rows) {
    return 0;
  }

  return sumInventoryAssetFromRows(rows);
}
