import PriceInput from "@/components/price-input";
import { STOCK_LOCATIONS } from "@/lib/stock-locations";
import type { Product } from "@/types/product";

export const productCreateInputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

export const productCreateLabelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type ProductCreateFieldsProps = {
  product?: Product;
  isEdit?: boolean;
  defaultValues?: {
    product_name?: string;
    model_name?: string;
    sku?: string;
  };
};

export default function ProductCreateFields({
  product,
  isEdit = false,
  defaultValues,
}: ProductCreateFieldsProps) {
  const productName =
    product?.product_name ?? defaultValues?.product_name ?? "";
  const modelName = product?.model_name ?? defaultValues?.model_name ?? "";
  const sku = product?.sku ?? defaultValues?.sku ?? "";

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          기본 정보
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="supplier" className={productCreateLabelClass}>
              공급처 <span className="text-red-500">*</span>
            </label>
            <input
              id="supplier"
              name="supplier"
              required
              defaultValue={product?.supplier ?? ""}
              placeholder="예: A사, B사"
              className={productCreateInputClass}
            />
          </div>

          <div>
            <label htmlFor="category" className={productCreateLabelClass}>
              카테고리
            </label>
            <input
              id="category"
              name="category"
              defaultValue={product?.category ?? ""}
              placeholder="예: 일렉기타"
              className={productCreateInputClass}
            />
          </div>

          <div>
            <label htmlFor="brand" className={productCreateLabelClass}>
              브랜드
            </label>
            <input
              id="brand"
              name="brand"
              defaultValue={product?.brand ?? ""}
              placeholder="예: Fender"
              className={productCreateInputClass}
            />
          </div>

          <div>
            <label htmlFor="product_name" className={productCreateLabelClass}>
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              id="product_name"
              name="product_name"
              required
              defaultValue={productName}
              placeholder="예: Fender Stratocaster"
              className={productCreateInputClass}
            />
          </div>

          <div>
            <label htmlFor="model_name" className={productCreateLabelClass}>
              모델명 <span className="text-red-500">*</span>
            </label>
            <input
              id="model_name"
              name="model_name"
              required
              defaultValue={modelName}
              placeholder="예: American Professional II"
              className={productCreateInputClass}
            />
          </div>

          <div>
            <label htmlFor="sku" className={productCreateLabelClass}>
              SKU (모델번호) <span className="text-red-500">*</span>
            </label>
            <input
              id="sku"
              name="sku"
              required
              defaultValue={sku}
              placeholder="예: FEN-STRAT-RED-M"
              className={productCreateInputClass}
            />
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              같은 SKU라도 매입가가 다르면 SKU 뒤에 -1, -2처럼 번호가 붙어
              등록됩니다. 매입가가 같으면 등록되지 않습니다.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <input
                type="checkbox"
                name="is_key_stock"
                defaultChecked={product?.is_key_stock ?? false}
                className="h-4 w-4 rounded border-zinc-400 accent-blue-600"
              />
              주요 재고
            </label>
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              체크하면 주요재고 페이지에 표시됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          검색 키워드 태그
        </h2>
        <div>
          <label htmlFor="keywords" className={productCreateLabelClass}>
            키워드 태그
          </label>
          <input
            id="keywords"
            name="keywords"
            defaultValue={product?.keywords ?? ""}
            placeholder="예: 드럼, 전자드럼, 롤랜드, 입문용"
            className={productCreateInputClass}
          />
          <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
            쉼표(,)로 구분해서 입력하세요. 판매 등록 시 이 키워드로도 검색됩니다.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          옵션 (색상 / 사이즈 등)
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="color" className={productCreateLabelClass}>
              색상
            </label>
            <input
              id="color"
              name="color"
              defaultValue={product?.color ?? ""}
              placeholder="예: 레드"
              className={productCreateInputClass}
            />
          </div>
          <div>
            <label htmlFor="product_option" className={productCreateLabelClass}>
              옵션
            </label>
            <input
              id="product_option"
              name="product_option"
              defaultValue={product?.product_option ?? ""}
              placeholder="예: HSS 픽업"
              className={productCreateInputClass}
            />
          </div>
          <div>
            <label htmlFor="size" className={productCreateLabelClass}>
              사이즈
            </label>
            <input
              id="size"
              name="size"
              defaultValue={product?.size ?? ""}
              placeholder="예: 14인치"
              className={productCreateInputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          가격 · 재고
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="purchase_price" className={productCreateLabelClass}>
              매입가격 (원)
            </label>
            <PriceInput
              id="purchase_price"
              name="purchase_price"
              min={0}
              defaultValue={product?.purchase_price ?? 0}
              className={productCreateInputClass}
            />
          </div>
          <div>
            <label htmlFor="sale_price" className={productCreateLabelClass}>
              소비자가 (원)
            </label>
            <PriceInput
              id="sale_price"
              name="sale_price"
              min={0}
              defaultValue={product?.sale_price ?? 0}
              className={productCreateInputClass}
            />
          </div>
          <div className="sm:col-start-2">
            <label htmlFor="stock_location" className={productCreateLabelClass}>
              재고 위치 <span className="text-red-500">*</span>
            </label>
            <select
              id="stock_location"
              name="stock_location"
              required
              defaultValue={product?.stock_location ?? "양재"}
              className={productCreateInputClass}
            >
              {STOCK_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              {isEdit
                ? "입고·출고 시 기본으로 적용되는 위치입니다."
                : "등록하는 재고가 들어갈 위치입니다."}
            </p>
          </div>
          <div>
            <label htmlFor="stock_quantity" className={productCreateLabelClass}>
              {isEdit ? "현재 재고수량 (합계)" : "현재 재고수량"}
            </label>
            {isEdit ? (
              <input
                id="stock_quantity"
                type="number"
                min={0}
                readOnly
                value={
                  (product?.stock_yangjae ?? 0) + (product?.stock_uiwang ?? 0)
                }
                className={`${productCreateInputClass} bg-zinc-100 dark:bg-zinc-800/80`}
              />
            ) : (
              <input
                id="stock_quantity"
                name="stock_quantity"
                type="number"
                min={0}
                defaultValue={0}
                className={productCreateInputClass}
              />
            )}
          </div>
          {isEdit ? (
            <>
              <div>
                <label htmlFor="stock_yangjae" className={productCreateLabelClass}>
                  양재 재고
                </label>
                <input
                  id="stock_yangjae"
                  name="stock_yangjae"
                  type="number"
                  min={0}
                  defaultValue={product?.stock_yangjae ?? 0}
                  className={productCreateInputClass}
                />
              </div>
              <div>
                <label htmlFor="stock_uiwang" className={productCreateLabelClass}>
                  의왕 재고
                </label>
                <input
                  id="stock_uiwang"
                  name="stock_uiwang"
                  type="number"
                  min={0}
                  defaultValue={product?.stock_uiwang ?? 0}
                  className={productCreateInputClass}
                />
              </div>
            </>
          ) : null}
          <div>
            <label
              htmlFor="min_stock_quantity"
              className={productCreateLabelClass}
            >
              최소 재고 알림
            </label>
            <input
              id="min_stock_quantity"
              name="min_stock_quantity"
              type="number"
              min={0}
              defaultValue={product?.min_stock_quantity ?? 0}
              className={productCreateInputClass}
            />
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              재고가 이 수량 이하로 떨어지면 나중에 알림을 표시합니다.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
