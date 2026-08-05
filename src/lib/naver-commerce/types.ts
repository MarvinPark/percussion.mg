export type NaverProductOrderContent = {
  content?: {
    order?: NaverProductOrderContent["order"];
    productOrder?: NaverProductOrderContent["productOrder"];
    delivery?: Record<string, unknown>;
  };
  order?: {
    orderId?: string;
    orderDate?: string;
    ordererName?: string;
    ordererTel?: string;
    ordererPhone?: string;
  };
  productOrder?: {
    productOrderId?: string;
    productName?: string;
    productOption?: string;
    sellerProductCode?: string;
    quantity?: number;
    initialQuantity?: number;
    remainQuantity?: number;
    totalPaymentAmount?: number;
    initialPaymentAmount?: number;
    remainPaymentAmount?: number;
    initialProductAmount?: number;
    productOrderStatus?: string;
  };
  productOrderId?: string;
  productName?: string;
  productOption?: string;
  sellerProductCode?: string;
  quantity?: number;
  initialQuantity?: number;
  remainQuantity?: number;
  totalPaymentAmount?: number;
  initialPaymentAmount?: number;
  remainPaymentAmount?: number;
  initialProductAmount?: number;
  productOrderStatus?: string;
  orderDate?: string;
  ordererName?: string;
  ordererTel?: string;
};

export type NaverProductOrdersResponse = {
  data?: {
    contents?: NaverProductOrderContent[];
    pagination?: {
      page?: number;
      size?: number;
      totalPages?: number;
    };
  };
  code?: string;
  message?: string;
};

export type ParsedSmartstoreOrder = {
  productOrderId: string;
  orderId: string;
  soldAt: string;
  productName: string;
  productOption: string;
  sellerProductCode: string;
  quantity: number;
  totalPaymentAmount: number;
  customerName: string;
  customerPhone: string;
  status: string;
};
