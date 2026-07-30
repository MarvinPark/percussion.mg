"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { updateProfile } from "@/app/my-page/actions";
import PhoneInput from "@/components/phone-input";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type ProfileEditPanelProps = {
  fullName: string;
  jobTitle: string;
  phone: string;
  email: string;
  onClose: () => void;
};

export default function ProfileEditPanel({
  fullName,
  jobTitle,
  phone,
  email,
  onClose,
}: ProfileEditPanelProps) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, formData: FormData) => {
      return (await updateProfile(formData)) ?? null;
    },
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state?.ok, router, onClose]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          내 정보 수정
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="edit_full_name" className={labelClass}>
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="edit_full_name"
            name="full_name"
            type="text"
            required
            defaultValue={fullName}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit_job_title" className={labelClass}>
            직함 <span className="text-red-500">*</span>
          </label>
          <input
            id="edit_job_title"
            name="job_title"
            type="text"
            required
            defaultValue={jobTitle}
            placeholder="예: 대표, 매니저, 영업팀장"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit_phone" className={labelClass}>
            전화번호 <span className="text-red-500">*</span>
          </label>
          <PhoneInput
            id="edit_phone"
            name="phone"
            required
            defaultValue={phone}
            placeholder="010-1234-5678"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit_email" className={labelClass}>
            이메일
          </label>
          <input
            id="edit_email"
            type="email"
            readOnly
            value={email}
            className={`${inputClass} cursor-not-allowed bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400`}
          />
        </div>

        {state?.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.error}
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
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
