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
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: string;
  payment_fee_rate: number;
  payment_fee_amount: number;
  total_amount: number;
  margin_amount: number;
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
  keywords?: string | null;
  supplier: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
};
