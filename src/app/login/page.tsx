import AppBrandTitle from "@/components/app-brand-title";
import { card } from "@/lib/ui-classes";
import LoginPageClient from "./login-page-client";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; register?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authError =
    params.error === "auth"
      ? "로그인 처리에 실패했습니다. 다시 시도해 주세요."
      : undefined;
  const initialMode = params.register === "1" ? "register" : "login";

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-1 items-center justify-center bg-background px-4 py-8">
      <div className={`w-full max-w-md ${card} border-t-2 border-t-accent/50 p-8`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <AppBrandTitle align="center" />
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            PERCY 재고·매출 관리
          </p>
        </div>

        <LoginPageClient authError={authError} initialMode={initialMode} />
      </div>
    </div>
  );
}
