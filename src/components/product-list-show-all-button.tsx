"use client";

import { useRouter, useSearchParams } from "next/navigation";

const buttonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default function ProductListShowAllButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClick() {
    const params = new URLSearchParams();
    const limit = searchParams.get("limit");
    const sort = searchParams.get("sort");
    const order = searchParams.get("order");

    if (limit) params.set("limit", limit);
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);

    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
  }

  return (
    <button type="button" onClick={handleClick} className={buttonClass}>
      전체보기
    </button>
  );
}
