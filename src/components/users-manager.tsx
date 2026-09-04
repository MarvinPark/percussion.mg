"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  approveUser,
  inviteUser,
  updateUserJobTitle,
  updateUserRole,
} from "@/app/(main)/settings/users/actions";
import { ROLE_LABELS, normalizeRole } from "@/lib/permissions";
import { formatPhoneForDisplay } from "@/lib/phone-format";
import {
  ACCOUNT_STATUS_LABELS,
  normalizeAccountStatus,
  type Profile,
  type UserRole,
} from "@/types/profile";

type UsersManagerProps = {
  profiles: Profile[];
  currentUserId: string;
};

const roleOptions: UserRole[] = ["admin", "manager", "employee"];

function rolesFromProfiles(profiles: Profile[]) {
  return Object.fromEntries(
    profiles.map((profile) => [profile.id, normalizeRole(profile.role)]),
  ) as Record<string, UserRole>;
}

function jobTitlesFromProfiles(profiles: Profile[]) {
  return Object.fromEntries(
    profiles.map((profile) => [profile.id, profile.job_title ?? ""]),
  ) as Record<string, string>;
}

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

export default function UsersManager({
  profiles,
  currentUserId,
}: UsersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, UserRole>>(() =>
    rolesFromProfiles(profiles),
  );
  const [jobTitles, setJobTitles] = useState<Record<string, string>>(() =>
    jobTitlesFromProfiles(profiles),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    setRoles(rolesFromProfiles(profiles));
    setJobTitles(jobTitlesFromProfiles(profiles));
  }, [profiles]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [message]);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function handleRoleChange(userId: string, nextRole: UserRole) {
    const previousRole = roles[userId];
    if (previousRole === nextRole) return;

    setRoles((current) => ({ ...current, [userId]: nextRole }));

    startTransition(async () => {
      const result = await updateUserRole(userId, nextRole);
      if ("error" in result && result.error) {
        setRoles((current) => ({ ...current, [userId]: previousRole }));
        window.alert(result.error);
        return;
      }

      setMessage("역할이 변경되었습니다.");
      refresh();
    });
  }

  function handleJobTitleBlur(userId: string, missingProfile?: boolean) {
    if (missingProfile) return;

    const previous = profiles.find((profile) => profile.id === userId)?.job_title ?? "";
    const next = jobTitles[userId]?.trim() ?? "";
    if (next === previous.trim()) return;

    startTransition(async () => {
      const result = await updateUserJobTitle(userId, next);
      if ("error" in result && result.error) {
        setJobTitles((current) => ({ ...current, [userId]: previous }));
        window.alert(result.error);
        return;
      }
      setMessage("직함이 변경되었습니다.");
      refresh();
    });
  }

  function handleApprove(userId: string) {
    const jobTitle = jobTitles[userId]?.trim() ?? "";
    if (!jobTitle) {
      window.alert("승인 전 직함을 입력해 주세요.");
      return;
    }

    startTransition(async () => {
      const result = await approveUser(userId, jobTitle);
      if ("error" in result && result.error) {
        window.alert(result.error);
        return;
      }
      setMessage("사용자가 승인되었습니다.");
      refresh();
    });
  }

  async function handleInvite(formData: FormData) {
    setInviteError(null);
    setMessage(null);
    const result = await inviteUser(formData);
    if ("error" in result && result.error) {
      setInviteError(result.error);
      return;
    }
    setMessage("초대 메일을 발송했습니다.");
    refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          사용자 추가
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          이메일로 초대 링크를 보냅니다. 로그인 후 이름·비밀번호를 입력하고
          관리자 승인 후 사용할 수 있습니다.
        </p>
        <form
          action={handleInvite}
          className="mt-4 grid gap-3"
        >
          <div>
            <label htmlFor="invite_email" className={labelClass}>
              이메일
            </label>
            <input
              id="invite_email"
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="invite_job_title" className={labelClass}>
              직함
            </label>
            <input
              id="invite_job_title"
              name="job_title"
              type="text"
              required
              placeholder="예: 영업팀장"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="invite_role" className={labelClass}>
              역할
            </label>
            <select
              id="invite_role"
              name="role"
              defaultValue="employee"
              className={inputClass}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              사용자 추가
            </button>
          </div>
        </form>
        {inviteError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {inviteError}
          </p>
        ) : null}
      </section>

      {message ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
        >
          {message}
        </p>
      ) : null}

      <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">이름</th>
              <th className="px-4 py-3 text-left font-semibold">이메일</th>
              <th className="px-4 py-3 text-left font-semibold">직함</th>
              <th className="px-4 py-3 text-left font-semibold">전화번호</th>
              <th className="px-4 py-3 text-left font-semibold">상태</th>
              <th className="px-4 py-3 text-left font-semibold">역할</th>
              <th className="px-4 py-3 text-left font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  등록된 사용자가 없습니다. 로그인 화면에서 사용자등록한 사람이
                  보이지 않으면 Supabase SQL과 Vercel service_role 키를
                  확인해 주세요.
                </td>
              </tr>
            ) : null}
            {profiles.map((profile) => {
              const status = normalizeAccountStatus(profile.account_status);
              return (
                <tr
                  key={profile.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 font-medium">
                    {profile.full_name === "미등록"
                      ? "-"
                      : profile.full_name}
                    {profile.id === currentUserId ? (
                      <span className="ml-2 text-xs text-zinc-500">(나)</span>
                    ) : null}
                    {profile.missingProfile ? (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                        (프로필 미생성)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {profile.email ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={jobTitles[profile.id] ?? ""}
                      disabled={isPending}
                      onChange={(event) =>
                        setJobTitles((current) => ({
                          ...current,
                          [profile.id]: event.target.value,
                        }))
                      }
                      onBlur={() => handleJobTitleBlur(profile.id, profile.missingProfile)}
                      className="w-full min-w-[8rem] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {profile.phone === "미등록"
                      ? "-"
                      : formatPhoneForDisplay(profile.phone)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        status === "active"
                          ? "text-green-700 dark:text-green-400"
                          : status === "pending_approval"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-zinc-600 dark:text-zinc-400"
                      }
                    >
                      {ACCOUNT_STATUS_LABELS[status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={roles[profile.id] ?? "employee"}
                      disabled={isPending}
                      onChange={(event) =>
                        handleRoleChange(
                          profile.id,
                          event.target.value as UserRole,
                        )
                      }
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {status === "pending_approval" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleApprove(profile.id)}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        승인
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">저장 중...</p>
      ) : null}
    </div>
  );
}
