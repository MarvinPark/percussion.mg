import PaymentMethodsManager from "@/components/payment-methods-manager";
import SaleCategoriesManager from "@/components/sale-categories-manager";
import UsersManager from "@/components/users-manager";
import { fetchAdminProfiles, getCurrentUserProfile } from "@/lib/profile";
import { fetchPaymentMethods } from "@/lib/payment-methods";
import { fetchAllSaleCategoryOptions } from "@/lib/sale-category-options";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";
import { redirect } from "next/navigation";

const sectionClass =
  "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { user } = await getCurrentUserProfile();

  if (!user) {
    redirect("/login");
  }

  const [
    { profiles, error: profilesError, needsMigration },
    { paymentMethods, error: paymentMethodsError },
    { options: saleCategoryOptions, error: saleCategoryError, needsMigration: saleCategoryNeedsMigration },
  ] = await Promise.all([
    fetchAdminProfiles(supabase),
    fetchPaymentMethods(supabase),
    fetchAllSaleCategoryOptions(supabase),
  ]);

  return (
    <main className="mx-auto max-w-app px-4 py-8 pb-24">
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        관리자
      </h2>
      <p className="mb-8 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        사용자, 결제 수단, 견적 구분을 관리합니다.
      </p>

      <div className="space-y-8">
        <section id="users" className={sectionClass}>
          <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            1. 사용자 관리
          </h3>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            직원 초대, 역할·직함 설정, 승인 처리를 합니다.
          </p>

          {profilesError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              사용자 목록을 불러오지 못했습니다.
              {profilesError ? (
                <p className="mt-2 text-xs opacity-80">{profilesError}</p>
              ) : null}
              <p className="mt-2">
                Supabase SQL Editor에서{" "}
                <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                  supabase/schema-phase7.sql
                </code>
                과{" "}
                <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                  supabase/schema-admin-settings.sql
                </code>
                을 실행해 주세요.
              </p>
            </div>
          ) : (
            <>
              {needsMigration ? (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  사용자 승인·이메일 기능을 쓰려면{" "}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
                    supabase/schema-admin-settings.sql
                  </code>
                  을 Supabase에서 실행해 주세요.
                </p>
              ) : null}
              <UsersManager
                profiles={profiles as Profile[]}
                currentUserId={user.id}
              />
            </>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section id="payment-methods" className={sectionClass}>
          <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            2. 결제수단관리
          </h3>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            판매·견적 등록 시 선택하는 결제 방식과 수수료율을 관리합니다.
          </p>

          {paymentMethodsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              결제 수단을 불러오지 못했습니다.
            </div>
          ) : (
            <PaymentMethodsManager
              paymentMethods={paymentMethods}
              embedded
            />
          )}
        </section>

        <section id="quote-categories" className={sectionClass}>
          <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            3. 견적
          </h3>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            견적·매출의 &quot;구분&quot; 선택 항목을 추가·수정합니다.
          </p>

          <SaleCategoriesManager
            options={saleCategoryOptions}
            schemaError={saleCategoryError}
            needsMigration={saleCategoryNeedsMigration}
          />
        </section>
        </div>
      </div>
    </main>
  );
}
