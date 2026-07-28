export type ProductFieldKey =
  | "supplier"
  | "category"
  | "brand"
  | "product_name"
  | "model_name"
  | "sku"
  | "color"
  | "product_option"
  | "size"
  | "purchase_price"
  | "sale_price"
  | "stock_quantity"
  | "min_stock_quantity";

export const PRODUCT_FIELD_LABELS: Record<ProductFieldKey, string> = {
  supplier: "공급처",
  category: "품목",
  brand: "브랜드",
  product_name: "제품명",
  model_name: "모델명",
  sku: "SKU",
  color: "색상",
  product_option: "옵션",
  size: "사이즈",
  purchase_price: "매입가",
  sale_price: "소비자가",
  stock_quantity: "현재고",
  min_stock_quantity: "최소알림",
};

export const FIELD_ALIASES: Record<ProductFieldKey, string[]> = {
  supplier: ["공급처", "수입사", "supplier", "vendor", "distributor", "거래처"],
  category: ["품목", "카테고리", "category", "분류"],
  brand: ["브랜드", "brand", "메이커", "maker"],
  product_name: ["제품명", "상품명", "품명", "product", "product name", "item name"],
  model_name: ["모델명", "model", "model name", "모델"],
  sku: ["sku", "모델번호", "품번", "item code", "item no", "model no", "code", "바코드"],
  color: ["색상", "color", "colour"],
  product_option: ["옵션", "option", "사양", "spec"],
  size: ["사이즈", "size", "규격"],
  purchase_price: ["매입가", "매입가격", "purchase", "dealer", "원가", "도매가"],
  sale_price: ["소비자가", "판매가", "판매가격", "sale", "retail", "msrp"],
  stock_quantity: ["현재고", "재고", "stock", "qty", "quantity", "수량"],
  min_stock_quantity: ["최소알림", "최소재고", "min stock", "minimum"],
};

export type ColumnMapping = Partial<Record<ProductFieldKey, string>>;

export type ParsedUpdateRow = {
  rowNumber: number;
  values: Partial<Record<ProductFieldKey, string | number>>;
};

export function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[/_-]/g, "");
}

export function normalizeMatchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
