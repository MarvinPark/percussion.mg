import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProductsPageClient from "@/components/products-page-client";
import {
  fetchProductListStats,
  fetchProductsPage,
  getProductPageSizeStorageKey,
  parseProductPageSize,
  PRODUCT_PAGE_SIZE,
  readProductPageSizeCookie,
} from "@/lib/product-list-loader";
import { parseProductListSort } from "@/lib/product-list-sort";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type ProductsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    limit?: string;
    sort?: string;
    order?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const searchQuery = params.q?.trim() ?? "";
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  const savedPageSizeCookie = readProductPageSizeCookie(
    (await cookies()).get(getProductPageSizeStorageKey(user.id))?.value,
  );
  const pageSize = params.limit
    ? parseProductPageSize(params.limit)
    : savedPageSizeCookie ?? PRODUCT_PAGE_SIZE;
  const sort = parseProductListSort(params.sort, params.order);

  const role = normalizeRole(profile?.role);
  const canManageProducts = hasPermission(role, "manageProducts");

  const [listStats, pageData] = await Promise.all([
    fetchProductListStats(supabase, searchQuery || undefined),
    fetchProductsPage(supabase, {
      page: requestedPage,
      pageSize,
      searchQuery,
      sort,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(listStats.totalCount / pageSize),
  );
  const currentPage = Math.min(requestedPage, totalPages);

  if (requestedPage !== currentPage && listStats.totalCount > 0) {
    const nextParams = new URLSearchParams();
    if (searchQuery) nextParams.set("q", searchQuery);
    if (currentPage > 1) nextParams.set("page", String(currentPage));
    if (pageSize !== PRODUCT_PAGE_SIZE) {
      nextParams.set("limit", String(pageSize));
    }
    if (sort.column) {
      nextParams.set("sort", sort.column);
      nextParams.set("order", sort.direction);
    }
    const suffix = nextParams.toString();
    redirect(suffix ? `/products?${suffix}` : "/products");
  }

  const { products, error } = pageData;

  return (
      <main className="mx-auto max-w-app px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              제품 목록
            </h2>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {canManageProducts
                ? "행을 클릭하면 선택됩니다. 우클릭하면 복사·수정·상세보기 등 메뉴를 사용할 수 있습니다."
                : "재고 현황을 조회할 수 있습니다. 수정은 관리자·매니저만 가능합니다."}
            </p>
          </div>
          {canManageProducts ? (
          <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/products/key-stock"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                주요재고현황
              </Link>
              <Link
                href="/products/stock"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                입고/출고
              </Link>
              <Link
                href="/products/history"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                변동 이력
              </Link>
              <Link
                href="/products/new"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                + 제품 등록
              </Link>
          </div>
          ) : (
          <Link
            href="/products/key-stock"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            주요재고현황
          </Link>
          )}
        </div>

        {!error && listStats.totalCount > 0 ? (
          <ProductsPageClient
            userId={user.id}
            products={products}
            listStats={listStats}
            currentPage={currentPage}
            totalPages={totalPages}
            searchQuery={searchQuery}
            pageSize={pageSize}
            sort={sort}
            readOnly={!canManageProducts}
          />
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <p className="font-medium">제품 목록을 불러오지 못했습니다.</p>
            <p className="mt-2">
              Supabase SQL Editor에서{" "}
              <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                supabase/schema.sql
              </code>{" "}
              파일 내용을 실행했는지 확인해 주세요.
            </p>
          </div>
        ) : searchQuery && listStats.totalCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              검색 결과가 없습니다.
            </p>
          </div>
        ) : !listStats.totalCount ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              아직 등록된 제품이 없습니다.
            </p>
            {canManageProducts ? (
            <Link
              href="/products/new"
              className="mt-4 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              첫 제품 등록하기
            </Link>
            ) : null}
          </div>
        ) : null}
      </main>
  );
}
