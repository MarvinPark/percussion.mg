"use client";

export type ProductSearchResultItem = {
  supplier?: string | null;
  category?: string | null;
  brand?: string | null;
  product_name: string;
  model_name: string;
  sku?: string | null;
};

function displayText(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}

type ProductSearchResultRowProps = {
  product: ProductSearchResultItem;
  onSelect: () => void;
  emphasizeModelName?: boolean;
};

export default function ProductSearchResultRow({
  product,
  onSelect,
  emphasizeModelName = false,
}: ProductSearchResultRowProps) {
  if (emphasizeModelName) {
    return (
      <li>
        <button
          type="button"
          role="option"
          onClick={onSelect}
          className="w-full border-b border-zinc-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
        >
          <p className="text-[13px] font-bold leading-snug text-zinc-900 dark:text-zinc-100">
            {product.model_name}
          </p>
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
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        role="option"
        onClick={onSelect}
        className="w-full border-b border-zinc-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
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
      </button>
    </li>
  );
}
