"use client";

import Link from "next/link";
import { useActionState } from "react";
import PhoneInput from "@/components/phone-input";
import { signup } from "./actions";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; message?: string } | null, formData: FormData) => {
      return (await signup(formData)) ?? null;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="full_name"
          className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          placeholder="홍길동"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          전화번호 <span className="text-red-500">*</span>
        </label>
        <PhoneInput
          id="phone"
          name="phone"
          required
          placeholder="010-1234-5678"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          이메일 <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="example@company.com"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          비밀번호 <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="6자 이상"
          className={inputClass}
        />
      </div>

      {state?.message ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          {state.message}
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
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {isPending ? "가입 중..." : "회원가입"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-blue-600 underline dark:text-blue-400">
          로그인
        </Link>
      </p>
    </form>
  );
}
