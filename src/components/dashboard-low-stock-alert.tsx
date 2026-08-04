import Link from "next/link";

type LowStockProduct = {
  id: string;
  product_name: string;
  model_name: string;
  stock_quantity: number;
  min_stock_quantity: number;
};

type DashboardLowStockAlertProps = {
  products: LowStockProduct[];
  canManageProducts?: boolean;
};

export default function DashboardLowStockAlert({
  products,
  canManageProducts = true,
}: DashboardLowStockAlertProps) {
  if (products.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
      <h3 className="font-medium text-amber-900 dark:text-amber-200">
        재고 부족 알림
      </h3>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
        {canManageProducts
          ? "항목을 클릭하면 제품 전체 수정 화면으로 이동합니다."
          : "재고가 최소 수량 이하인 제품입니다."}
      </p>
      <ul className="mt-3 space-y-1 text-sm text-amber-800 dark:text-amber-300">
        {products.map((item) => {
          const label = (
            <>
              {item.product_name}
              {item.model_name ? ` (${item.model_name})` : ""} — 현재{" "}
              {item.stock_quantity}개 (최소 {item.min_stock_quantity}개)
            </>
          );

          if (!canManageProducts) {
            return (
              <li key={item.id} className="rounded-lg px-2 py-1.5">
                {label}
              </li>
            );
          }

          return (
            <li key={item.id}>
              <Link
                href={`/products/${item.id}/edit`}
                className="block w-full rounded-lg px-2 py-1.5 transition hover:bg-amber-100/80 dark:hover:bg-amber-900/50"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
