import Link from "next/link";
import StockInList from "@/components/stock-in-list";
import { hasPermission, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/lib/profile";
import { getRolePermissionMap } from "@/lib/role-permission-settings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { StockMovementWithProduct } from "@/types/stock-movement";

export default async function StockInListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getCurrentUserProfile();
  const role = normalizeRole(profile?.role);
  const permissionMap = await getRolePermissionMap();
  const canManage = hasPermission(role, "manageProducts", permissionMap);

  const { data: movements, error } = await supabase
    .from("stock_movements")
    .select("*, products(product_name, model_name, sku, supplier)")
    .eq("movement_type", "in")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="mx-auto max-w-app px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/products/stock"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← 입고기록으로
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            입고목록
          </h2>
          <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            누가, 언제, 어떤 제품을 입고 기록했는지 확인할 수 있습니다.
          </p>
        </div>
        <Link
          href="/products/stock"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          + 입고기록
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <p className="font-medium">입고 목록을 불러오지 못했습니다.</p>
          <p className="mt-2">
            Supabase SQL Editor에서{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900">
              supabase/schema-phase3.sql
            </code>
            ,{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900">
              supabase/schema-stock-movement-date.sql
            </code>
            ,{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900">
              supabase/schema-stock-movements-manage.sql
            </code>
            을 실행했는지 확인해 주세요.
          </p>
        </div>
      ) : !movements?.length ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            아직 입고 기록이 없습니다.
          </p>
          <Link
            href="/products/stock"
            className="mt-4 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
          >
            첫 입고 기록하기
          </Link>
        </div>
      ) : (
        <StockInList
          movements={movements as StockMovementWithProduct[]}
          canManage={canManage}
        />
      )}
    </main>
  );
}
