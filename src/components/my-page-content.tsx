"use client";

import { useState } from "react";
import PasswordChangePanel from "@/components/password-change-panel";
import ProfileEditPanel from "@/components/profile-edit-panel";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatPhoneForDisplay } from "@/lib/phone-format";
import type { UserRole } from "@/types/profile";

type MyPageContentProps = {
  fullName: string;
  jobTitle: string;
  phone: string;
  email: string;
  role: UserRole;
};

export default function MyPageContent({
  fullName,
  jobTitle,
  phone,
  email,
  role,
}: MyPageContentProps) {
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          내 정보
        </h3>

        {showProfileEdit ? (
          <ProfileEditPanel
            fullName={fullName}
            jobTitle={jobTitle}
            phone={phone}
            email={email}
            onClose={() => setShowProfileEdit(false)}
          />
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  이름
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {fullName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  직함
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {jobTitle}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  전화번호
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatPhoneForDisplay(phone)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  역할
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {ROLE_LABELS[role]}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  이메일
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {email}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => setShowProfileEdit(true)}
              className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              내 정보 수정
            </button>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          계정
        </h3>

        {!showPasswordChange ? (
          <button
            type="button"
            onClick={() => setShowPasswordChange(true)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            비밀번호 변경
          </button>
        ) : (
          <PasswordChangePanel onClose={() => setShowPasswordChange(false)} />
        )}
      </section>
    </div>
  );
}
