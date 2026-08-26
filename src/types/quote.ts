import type { FulfillmentLocation } from "@/lib/quote-fulfillment";

export type QuoteItemInput = {
  product_id: string;
  fulfillment_location: FulfillmentLocation;
  supplier: string;
  purchase_source: string;
  category: string;
  brand: string;
  product_name: string;
  model_name: string;
  color?: string | null;
  product_option?: string | null;
  size?: string | null;
  quantity: number;
  consumer_price: number;
  sale_unit_price: number;
  rounded_unit_price: number;
  line_total: number;
  purchase_price: number;
  shipping_cost: number;
  margin: number;
  margin_rate: number;
};

export type QuoteFormData = {
  quote_date: string;
  sale_category: string;
  customer_name: string;
  business_partner: string;
  partner_id: string;
  customer_phone: string;
  customer_address: string;
  customer_email: string;
  customer_note: string;
  memo: string;
  manager_name: string;
  manager_phone: string;
  payment_method_id: string;
  items: QuoteItemInput[];
};

export type Quote = {
  id: string;
  quote_date: string;
  sale_category: string;
  customer_name: string;
  business_partner: string | null;
  partner_id: string | null;
  customer_phone: string;
  customer_address: string | null;
  customer_email: string | null;
  customer_note: string | null;
  memo: string | null;
  manager_name: string | null;
  payment_method_id: string | null;
  payment_method: string | null;
  delivery_method: string | null;
  delivery_date_note: string | null;
  total_amount: number;
  card_amount: number;
  created_by_name: string | null;
  created_at: string;
};

export type QuoteWithItems = Quote & {
  quote_items: QuoteItemInput & { id: string }[];
};

export type QuoteProductOption = {
  id: string;
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  category: string | null;
  brand: string | null;
  color: string | null;
  product_option: string | null;
  size: string | null;
  sale_price: number;
  purchase_price: number;
};

export const QUOTE_MAX_ITEMS = 50;
export const QUOTE_LINE_START_ROW = 14;
export const QUOTE_LINE_COUNT = 50;

export const SUPPLIER_INFO = {
  companyName: "(주)비에스비인터내셔널",
  brandLine: " -퍼커션센터",
  representative: "대표자 조익환",
  businessNumber: "488-81-02809",
  email: "percussion.cs@gmail.com",
  phone: "02-573-7485",
  address: "서울 서초구 양재동 392-10 정암빌딩 지하",
  manager: "담당 전인철 실장 010-4311-3604",
  transactionReceipt: "위와 같이 거래하였음을 정히 영수합니다.",
  bank: "계좌정보: 우리은행(1005-804-509027) (주)비에스비인터내셔널",
  footerNote:
    "- 위 견적은 일주일간 유효하며 이후 금액이 변동될 수 있습니다.\n- 현금가 기준이며, 카드결제시 4% 수수료 추가됩니다.\n- 타 업체에 해당 견적서 유출을 방지해 주시기 바랍니다.\n- 견적중 일부 상품만 구매시 금액이 변동될 수 있습니다.",
};
