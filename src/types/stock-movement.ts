export type MovementType = "in" | "out" | "adjust";

export type StockMovement = {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  note: string | null;
  movement_date: string | null;
  modified_by_user_id: string | null;
  modified_by_name: string | null;
  created_at: string;
};

export type StockMovementWithProduct = StockMovement & {
  products: {
    product_name: string;
    model_name: string;
    sku: string;
    supplier: string;
  } | null;
};

export const movementTypeLabel: Record<MovementType, string> = {
  in: "입고",
  out: "출고",
  adjust: "직접 수정",
};
