"use client";

import { useState, useTransition } from "react";
import { changePassword, verifyCurrentPassword } from "@/app/my-page/actions";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type PasswordChangePanelProps = {
  onClose: () => void;
};

export default function PasswordChangePanel({ onClose }: PasswordChangePanelProps) {
  const [step, setStep] = useState<"verify" | "change" | "done">("verify");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyCurrentPassword(currentPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("change");
    });
  }

  function handleChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("current_password", currentPassword);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep("done");
      setSuccessMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          비밀번호 변경
        </h3>
      </div>

      {step === "verify" ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            본인 확인을 위해 현재 비밀번호를 입력해 주세요.
          </p>
          <div>
            <label htmlFor="verify_current_password" className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              현재 비밀번호
            </label>
            <input
              id="verify_current_password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              {isPending ? "확인 중..." : "확인"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "change" ? (
        <form onSubmit={handleChange} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            새 비밀번호를 입력해 주세요.
          </p>
          <div>
            <label htmlFor="new_password" className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              새 비밀번호
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirm_password" className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              새 비밀번호 확인
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("verify");
                setError(null);
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              이전
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              {isPending ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "done" ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            {successMessage}
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
