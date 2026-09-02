"use client";

import { formatKRW } from "@/lib/sales-calculator";
import {
  availableProductStock,
  hasProductStockSummaryData,
  type ProductStockFields,
} from "@/lib/product-stock-display";

export type ProductSearchResultItem = {
  supplier?: string | null;
  category?: string | null;
  brand?: string | null;
  product_name: string;
  model_name: string;
  sku?: string | null;
  sale_price?: number;
  purchase_price?: number;
} & ProductStockFields;

function displayText(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}

function ProductSearchStockSummary({ product }: { product: ProductStockFields }) {
  if (!hasProductStockSummaryData(product)) return null;

  const floor3 = Number(product.stock_floor3) || 0;
  const b1 = Number(product.stock_b1) || 0;
  const uiwang = Number(product.stock_display) || 0;
  const reserved = Number(product.reserved_quantity) || 0;
  const available = availableProductStock(product);

  const itemClass =
    "inline-flex items-center gap-0.5 rounded bg-zinc-100/90 px-1.5 py-0.5 dark:bg-zinc-800/80";
  const labelClass = "text-zinc-500 dark:text-zinc-400";
  const valueClass = "font-semibold text-zinc-800 dark:text-zinc-100";

  return (
    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] leading-none tabular-nums">
      <span className={itemClass}>
        <span className={labelClass}>3층</span>
        <span className={valueClass}>{floor3}</span>
      </span>
      <span className={itemClass}>
        <span className={labelClass}>B1</span>
        <span className={valueClass}>{b1}</span>
      </span>
      <span className={itemClass}>
        <span className={labelClass}>의왕</span>
        <span className={valueClass}>{uiwang}</span>
      </span>
      <span className={`${itemClass} bg-lime-100/80 dark:bg-lime-950/35`}>
        <span className="text-lime-700 dark:text-lime-400">예약</span>
        <span className="font-semibold text-lime-800 dark:text-lime-300">
          {reserved}
        </span>
      </span>
      <span className={`${itemClass} bg-green-100/80 dark:bg-green-950/35`}>
        <span className="text-green-700 dark:text-green-400">가용</span>
        <span className="font-semibold text-green-800 dark:text-green-300">
          {available}
        </span>
      </span>
    </div>
  );
}

type ProductSearchResultRowProps = {
  product: ProductSearchResultItem;
  onSelect: () => void;
  emphasizeModelName?: boolean;
  priceField?: "sale_price" | "purchase_price";
  highlighted?: boolean;
  onHighlight?: () => void;
  resultIndex?: number;
};

const highlightOptionClass =
  "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100";

export default function ProductSearchResultRow({
  product,
  onSelect,
  emphasizeModelName = false,
  priceField = "purchase_price",
  highlighted = false,
  onHighlight,
  resultIndex,
}: ProductSearchResultRowProps) {
  const displayPrice =
    priceField === "purchase_price"
      ? product.purchase_price
      : product.sale_price;

  if (emphasizeModelName) {
    return (
      <li data-result-index={resultIndex}>
        <button
          type="button"
          role="option"
          aria-selected={highlighted}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={onHighlight}
          onClick={onSelect}
          className={`w-full border-b border-zinc-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
            highlighted ? highlightOptionClass : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 flex-1 truncate text-[13px] font-bold leading-snug text-zinc-900 dark:text-zinc-100">
              {product.model_name}
            </p>
            {displayPrice != null ? (
              <span className="shrink-0 text-right leading-tight">
                <span className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  매입가
                </span>
                <span className="block whitespace-nowrap text-[13px] font-bold tabular-nums text-blue-700 dark:text-blue-300">
                  {formatKRW(displayPrice)}원
                </span>
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 grid gap-1 text-[11px] leading-snug sm:grid-cols-3">
            <span>
              <span className="text-zinc-500 dark:text-zinc-400">제품명 </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {product.product_name}
              </span>
            </span>
            <span>
              <span className="text-zinc-500 dark:text-zinc-400">SKU </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {displayText(product.sku)}
              </span>
            </span>
            <span>
              <span className="text-zinc-500 dark:text-zinc-400">공급처 </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {displayText(product.supplier)}
              </span>
            </span>
            <span>
              <span className="text-zinc-500 dark:text-zinc-400">품목 </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {displayText(product.category)}
              </span>
            </span>
            <span>
              <span className="text-zinc-500 dark:text-zinc-400">브랜드 </span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {displayText(product.brand)}
              </span>
            </span>
          </div>
          <ProductSearchStockSummary product={product} />
        </button>
      </li>
    );
  }

  return (
    <li data-result-index={resultIndex}>
      <button
        type="button"
        role="option"
        aria-selected={highlighted}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={onHighlight}
        onClick={onSelect}
        className={`w-full border-b border-zinc-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
          highlighted ? highlightOptionClass : ""
        }`}
      >
        <div className="grid gap-1 text-[11px] leading-snug sm:grid-cols-3">
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">공급처 </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {displayText(product.supplier)}
            </span>
          </span>
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">품목 </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {displayText(product.category)}
            </span>
          </span>
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">브랜드 </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {displayText(product.brand)}
            </span>
          </span>
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">제품명 </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.product_name}
            </span>
          </span>
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">모델명 </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {product.model_name}
            </span>
          </span>
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">SKU </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {displayText(product.sku)}
            </span>
          </span>
        </div>
        <ProductSearchStockSummary product={product} />
      </button>
    </li>
  );
}
