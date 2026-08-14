import AppBrandTitle from "@/components/app-brand-title";
import { card } from "@/lib/ui-classes";
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
    <div className="flex min-h-full flex-1 items-center justify-center bg-background px-4">
      <div className={`w-full max-w-md ${card} border-t-2 border-t-accent/50 p-8`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <AppBrandTitle align="center" />
        </div>

        <LoginForm authError={authError} />
      </div>
    </div>
  );
}
