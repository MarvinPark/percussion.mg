export type TaxInvoicePurposeType = "영수" | "청구";

export type TaxInvoiceDetailItem = {
  name: string;
  supply_cost: number;
  tax_amount: number;
};

export type TaxInvoiceIssue = {
  id: string;
  mgt_key: string;
  partner_id: string | null;
  partner_name: string;
  partner_corp_num: string | null;
  partner_email: string | null;
  sale_ids: string[];
  sale_count: number;
  item_name: string;
  detail_items: TaxInvoiceDetailItem[];
  purpose_type: TaxInvoicePurposeType;
  write_date: string;
  item_purchase_date: string;
  total_amount: number;
  supply_cost: number;
  tax_amount: number;
  nts_confirm_num: string | null;
  popbill_code: number | null;
  popbill_message: string | null;
  popbill_state: string | null;
  cancelled_at: string | null;
  cancel_memo: string | null;
  issued_by_user_id: string | null;
  issued_by_name: string | null;
  is_test: boolean;
  created_at: string;
};

export type TaxInvoiceItemDraft = {
  id: string;
  name: string;
};
