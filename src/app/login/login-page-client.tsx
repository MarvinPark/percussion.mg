"use client";

import { useActionState, useState } from "react";
import PhoneInput from "@/components/phone-input";
import { btnPrimary, inputBase } from "@/lib/ui-classes";
import { login, registerUser } from "./actions";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type AuthMode = "login" | "register";

type LoginPageClientProps = {
  authError?: string;
  initialMode?: AuthMode;
};

function ModeTabs({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800/80">
      <button
        type="button"
        onClick={() => onChange("login")}
        className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
          mode === "login"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        로그인
      </button>
      <button
        type="button"
        onClick={() => onChange("register")}
        className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
          mode === "register"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        사용자등록
      </button>
    </div>
  );
}

export default function LoginPageClient({
  authError,
  initialMode = "login",
}: LoginPageClientProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [loginState, loginAction, isLoginPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await login(formData)) ?? null;
    },
    null,
  );

  const [registerState, registerAction, isRegisterPending] = useActionState(
    async (
      _prev: { error?: string; success?: string } | null,
      formData: FormData,
    ) => {
      return (await registerUser(formData)) ?? null;
    },
    null,
  );

  const isPending = isLoginPending || isRegisterPending;

  return (
    <div className="space-y-4">
      <ModeTabs mode={mode} onChange={setMode} />

      {mode === "login" ? (
        <>
          <div className="text-center">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              로그인
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              등록된 계정으로 로그인해 주세요.
            </p>
          </div>

          <form action={loginAction} className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                아이디 (이메일)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="example@company.com"
                className={`w-full ${inputBase} py-2.5`}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="비밀번호 입력"
                className={`w-full ${inputBase} py-2.5`}
              />
            </div>

            {authError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {authError}
              </p>
            ) : null}

            {loginState?.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {loginState.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className={`flex w-full items-center justify-center ${btnPrimary} py-2.5`}
            >
              {isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="text-center">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              사용자 등록
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              이메일, 이름, 전화번호를 입력해 주세요.
            </p>
          </div>

          <form action={registerAction} className="space-y-4">
            <div>
              <label htmlFor="register_email" className={labelClass}>
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                id="register_email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="example@company.com"
                className={`w-full ${inputBase} py-2.5`}
              />
            </div>

            <div>
              <label htmlFor="register_full_name" className={labelClass}>
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="register_full_name"
                name="full_name"
                type="text"
                required
                placeholder="홍길동"
                className={`w-full ${inputBase} py-2.5`}
              />
            </div>

            <div>
              <label htmlFor="register_phone" className={labelClass}>
                전화번호 <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                id="register_phone"
                name="phone"
                required
                placeholder="01012345678"
                className={`w-full ${inputBase} py-2.5`}
              />
            </div>

            <div>
              <label htmlFor="register_password" className={labelClass}>
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="register_password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8자 이상"
                className={`w-full ${inputBase} py-2.5`}
              />
            </div>

            <div>
              <label htmlFor="register_password_confirm" className={labelClass}>
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <input
                id="register_password_confirm"
                name="password_confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="비밀번호 다시 입력"
                className={`w-full ${inputBase} py-2.5`}
              />
            </div>

            {registerState?.success ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                <p className="font-semibold">인증 후 사용 가능합니다.</p>
                <p className="mt-1">{registerState.success}</p>
              </div>
            ) : null}

            {registerState?.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {registerState.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className={`flex w-full items-center justify-center ${btnPrimary} py-2.5`}
            >
              {isPending ? "등록 중..." : "등록하기"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
