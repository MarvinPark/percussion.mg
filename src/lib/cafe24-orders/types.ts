export type ParsedCafe24OrderRow = {
  lineId: string;
  mallName: string;
  orderNo: string;
  soldAt: string;
  productName: string;
  productNo: string;
  productOption: string;
  sellerProductCode: string;
  cafe24PaymentMethod: string;
  paymentProvider: string;
  unitSalePrice: number;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note: string;
};

export type Cafe24ExcelImportPreviewItem = ParsedCafe24OrderRow & {
  matchedProductId: string | null;
  matchedProductName: string | null;
  matchedProductModelName: string | null;
  matchedProductBrand: string | null;
  matchedProductSku: string | null;
  alreadyImported: boolean;
};

export type Cafe24ExcelImportResult = {
  imported: number;
  skippedExisting: number;
  skippedUnmatched: number;
  skippedMissingPayment: number;
  createdProducts: number;
  errors: string[];
};

export type Cafe24ExcelImportOptions = {
  autoCreateProducts?: boolean;
  manualMatches?: Record<string, string>;
  dismissedAutoMatches?: string[];
  paymentMethodIds?: Record<string, string>;
  fulfillmentLocations?: Record<string, "직발송" | "매장">;
};
