"use client";

import { useActionState } from "react";
import PhoneInput from "@/components/phone-input";
import { completeProfile } from "./actions";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

export default function ProfileSetupForm({
  mode = "standard",
  defaultFullName = "",
  defaultJobTitle = "",
  defaultPhone = "",
}: {
  mode?: "standard" | "invited";
  defaultFullName?: string;
  defaultJobTitle?: string;
  defaultPhone?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await completeProfile(formData)) ?? null;
    },
    null,
  );

  const isInvited = mode === "invited";

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
          defaultValue={defaultFullName}
          className={inputClass}
        />
      </div>

      {isInvited ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              직함
            </label>
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              {defaultJobTitle || "관리자가 지정합니다"}
            </p>
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
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="password_confirm"
              className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label
              htmlFor="job_title"
              className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              직함 <span className="text-red-500">*</span>
            </label>
            <input
              id="job_title"
              name="job_title"
              type="text"
              required
              defaultValue={defaultJobTitle}
              placeholder="예: 대표, 매니저, 영업팀장"
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
              defaultValue={defaultPhone}
              placeholder="01012345678"
              className={inputClass}
            />
          </div>
        </>
      )}

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
        {isPending
          ? "저장 중..."
          : isInvited
            ? "저장하고 승인 요청"
            : "저장하고 시작하기"}
      </button>
    </form>
  );
}
