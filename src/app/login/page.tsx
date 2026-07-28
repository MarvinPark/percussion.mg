import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authError =
    params.error === "auth"
      ? "로그인 처리에 실패했습니다. 다시 시도해 주세요."
      : undefined;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest text-zinc-600 dark:text-zinc-400">
            PERCUSSIONCENTER
          </p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            관리시스템
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            재고 · 매출 · 견적을 한곳에서 관리합니다
          </p>
        </div>

        <LoginForm authError={authError} />
      </div>
    </div>
  );
}
