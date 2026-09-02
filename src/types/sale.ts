export type PaymentMethod = {
  id: string;
  name: string;
  fee_rate: number;
  sort_order: number;
};

export type Sale = {
  id: string;
  sold_at: string;
  sale_category: string;
  product_id: string;
  quantity: number;
  unit_sale_price: number;
  unit_purchase_price: number;
  customer_name: string | null;
  business_partner: string | null;
  partner_id: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: string;
  payment_fee_rate: number;
  payment_fee_amount: number;
  total_amount: number;
  margin_amount: number;
  shipping_cost: number;
  note: string | null;
  created_by_user_id: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type SaleWithProduct = Sale & {
  products: {
    product_name: string;
    model_name: string;
    sku: string;
  } | null;
};

export type SaleProductOption = {
  id: string;
  product_name: string;
  model_name: string;
  sku?: string;
  category?: string | null;
  brand?: string | null;
  keywords?: string | null;
  supplier: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  stock_floor3?: number;
  stock_b1?: number;
  stock_display?: number;
  reserved_quantity?: number;
};

/** 판매 등록 등에서 제품 목록 조회 시 사용 */
export const SALE_PRODUCT_OPTION_SELECT =
  "id, product_name, model_name, sku, category, brand, keywords, supplier, sale_price, purchase_price, stock_quantity, stock_floor3, stock_b1, stock_display, reserved_quantity";
