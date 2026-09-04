import { Suspense } from "react";
import OverheadExpensesManager from "@/components/overhead-expenses-manager";
import OverheadProfitPanel from "@/components/overhead-profit-panel";
import { SettingsCompactSkeleton } from "@/components/settings-section-skeleton";
import { createPageMetadata } from "@/lib/document-titles";
import {
  currentAccrualMonthValue,
  currentDateString,
  fetchOverheadCategories,
  fetchOverheadExpensesForMonth,
  parseAccrualMonth,
} from "@/lib/overhead-expenses";
import { getCurrentUserProfile } from "@/lib/profile";
import { normalizeRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata("결산");

type OverheadPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function OverheadSettingsPage({
  searchParams,
}: OverheadPageProps) {
  const { user, profile } = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  if (normalizeRole(profile?.role) !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const monthParam = params.month?.trim() ?? "";
  const month =
    parseAccrualMonth(monthParam)?.slice(0, 7) ?? currentAccrualMonthValue();

  const supabase = await createClient();
  const [{ categories, error: categoriesError }, { expenses, error: expensesError }] =
    await Promise.all([
      fetchOverheadCategories(supabase),
      fetchOverheadExpensesForMonth(supabase, month),
    ]);

  const schemaError = categoriesError ?? expensesError;
  const overheadTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <main className="mx-auto max-w-app px-4 py-8 pb-24">
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        결산
      </h2>
      <p className="mb-8 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        관리자 전용 · 월별 매출·판관비·영업이익 결산 및 판관비 등록
      </p>

      <OverheadExpensesManager
        categories={categories}
        expenses={expenses}
        initialMonth={month}
        defaultExpenseDate={currentDateString()}
        schemaError={schemaError}
        profitPanel={
          <Suspense fallback={<SettingsCompactSkeleton />}>
            <OverheadProfitPanel month={month} overheadTotal={overheadTotal} />
          </Suspense>
        }
      />
    </main>
  );
}
