import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaxInvoiceIssue } from "@/types/tax-invoice";

export function mapTaxInvoiceIssueRow(
  row: Record<string, unknown>,
): TaxInvoiceIssue {
  const saleIds = row.sale_ids;
  return {
    id: String(row.id),
    mgt_key: String(row.mgt_key ?? ""),
    partner_id: (row.partner_id as string | null) ?? null,
    partner_name: String(row.partner_name ?? ""),
    partner_corp_num: (row.partner_corp_num as string | null) ?? null,
    partner_email: (row.partner_email as string | null) ?? null,
    sale_ids: Array.isArray(saleIds) ? saleIds.map(String) : [],
    sale_count: Number(row.sale_count) || 0,
    item_name: String(row.item_name ?? ""),
    purpose_type: row.purpose_type as TaxInvoiceIssue["purpose_type"],
    write_date: String(row.write_date ?? ""),
    item_purchase_date: String(row.item_purchase_date ?? ""),
    total_amount: Number(row.total_amount) || 0,
    supply_cost: Number(row.supply_cost) || 0,
    tax_amount: Number(row.tax_amount) || 0,
    nts_confirm_num: (row.nts_confirm_num as string | null) ?? null,
    popbill_code:
      row.popbill_code === null || row.popbill_code === undefined
        ? null
        : Number(row.popbill_code),
    popbill_message: (row.popbill_message as string | null) ?? null,
    issued_by_user_id: (row.issued_by_user_id as string | null) ?? null,
    issued_by_name: (row.issued_by_name as string | null) ?? null,
    is_test: Boolean(row.is_test),
    detail_items: parseDetailItems(row.detail_items),
    popbill_state: (row.popbill_state as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    cancel_memo: (row.cancel_memo as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

function parseDetailItems(value: unknown): TaxInvoiceIssue["detail_items"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      return {
        name,
        supply_cost: Number(row.supply_cost) || 0,
        tax_amount: Number(row.tax_amount) || 0,
      };
    })
    .filter((item): item is TaxInvoiceIssue["detail_items"][number] => item !== null);
}

export async function fetchTaxInvoiceIssues(
  supabase: SupabaseClient,
  options?: { limit?: number },
) {
  const { data, error } = await supabase
    .from("tax_invoice_issues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 5000);

  return {
    issues: (data ?? []).map((row) => mapTaxInvoiceIssueRow(row)),
    error: error?.message ?? null,
  };
}

export function formatTaxInvoiceDateLabel(value: string | null | undefined) {
  if (!value) return "-";
  const normalized = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return value;
  return normalized.replace(/-/g, ".");
}
