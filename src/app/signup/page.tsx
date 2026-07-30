import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest text-zinc-600 dark:text-zinc-400">
            PERCUSSIONCENTER
          </p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            회원가입
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            이름, 직함, 전화번호를 입력해야 시스템을 사용할 수 있습니다.
          </p>
        </div>

        <SignupForm />
      </div>
    </div>
  );
}
