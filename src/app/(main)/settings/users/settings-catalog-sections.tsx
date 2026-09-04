import OverheadCategoriesManager from "@/components/overhead-categories-manager";
import PaymentMethodsManager from "@/components/payment-methods-manager";
import SaleCategoriesManager from "@/components/sale-categories-manager";
import { fetchAllOverheadCategories } from "@/lib/overhead-expenses";
import { fetchPaymentMethods } from "@/lib/payment-methods";
import { fetchAllSaleCategoryOptions } from "@/lib/sale-category-options";
import { createClient } from "@/lib/supabase/server";

const sectionClass =
  "min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900";

type SettingsCatalogSectionsProps = {
  isAdmin: boolean;
};

export default async function SettingsCatalogSections({
  isAdmin,
}: SettingsCatalogSectionsProps) {
  const supabase = await createClient();
  const [
    { paymentMethods, error: paymentMethodsError },
    { options: saleCategoryOptions, error: saleCategoryError, needsMigration: saleCategoryNeedsMigration },
    overheadCategoriesResult,
  ] = await Promise.all([
    fetchPaymentMethods(supabase),
    fetchAllSaleCategoryOptions(supabase),
    isAdmin
      ? fetchAllOverheadCategories(supabase)
      : Promise.resolve({ categories: [], error: null }),
  ]);

  return (
    <div
      className={`grid min-w-0 grid-cols-1 gap-6 lg:items-start ${
        isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2"
      }`}
    >
      <section id="payment-methods" className={sectionClass}>
        <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          3. 결제수단관리
        </h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          판매·견적 등록 시 선택하는 결제 방식과 수수료율을 관리합니다.
        </p>

        {paymentMethodsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            결제 수단을 불러오지 못했습니다.
          </div>
        ) : (
          <PaymentMethodsManager paymentMethods={paymentMethods} embedded />
        )}
      </section>

      <section id="quote-categories" className={sectionClass}>
        <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          4. 견적
        </h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          견적·매출·주문 불러오기 등 전체 영역에서 사용하는 &quot;구분&quot; 항목을
          추가·수정합니다.
        </p>

        <SaleCategoriesManager
          options={saleCategoryOptions}
          schemaError={saleCategoryError}
          needsMigration={saleCategoryNeedsMigration}
        />
      </section>

      {isAdmin ? (
        <section id="overhead-categories" className={sectionClass}>
          <h3 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            5. 판관비
          </h3>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            판관비 등록 화면에서 선택하는 대분류·세부항목을 추가·수정·삭제합니다.
          </p>
          <OverheadCategoriesManager
            categories={overheadCategoriesResult.categories}
            schemaError={overheadCategoriesResult.error}
          />
        </section>
      ) : null}
    </div>
  );
}
