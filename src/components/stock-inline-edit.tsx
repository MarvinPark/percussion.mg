import { updateStock } from "@/app/products/actions";

const inputClass =
  "w-10 rounded border border-zinc-400 bg-white px-1 py-0.5 text-[10px] font-normal text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type StockInlineEditProps = {
  productId: string;
  stockQuantity: number;
};

export default function StockInlineEdit({
  productId,
  stockQuantity,
}: StockInlineEditProps) {
  return (
    <form action={updateStock} className="flex items-center gap-0.5">
      <input type="hidden" name="id" value={productId} />
      <input
        type="number"
        name="stock_quantity"
        defaultValue={stockQuantity}
        min={0}
        aria-label="재고 수량"
        className={inputClass}
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-1.5 py-0.5 text-[12px] font-normal leading-none text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        OK
      </button>
    </form>
  );
}
