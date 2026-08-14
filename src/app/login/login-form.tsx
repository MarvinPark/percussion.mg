"use client";

import { useActionState } from "react";
import { btnPrimary, inputBase } from "@/lib/ui-classes";
import { login } from "./actions";

export default function LoginForm({ authError }: { authError?: string }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await login(formData)) ?? null;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          이메일
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
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
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

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`w-full ${btnPrimary} py-2.5`}
      >
        {isPending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
