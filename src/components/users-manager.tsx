"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateUserRole } from "@/app/(main)/settings/users/actions";
import { ROLE_LABELS, normalizeRole } from "@/lib/permissions";
import { formatPhoneForDisplay } from "@/lib/phone-format";
import type { Profile, UserRole } from "@/types/profile";

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

export default function UsersManager({
  profiles,
  currentUserId,
}: UsersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, UserRole>>(() =>
    rolesFromProfiles(profiles),
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRoles(rolesFromProfiles(profiles));
  }, [profiles]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [message]);

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
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
        >
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">이름</th>
              <th className="px-4 py-3 text-left font-semibold">직함</th>
              <th className="px-4 py-3 text-left font-semibold">전화번호</th>
              <th className="px-4 py-3 text-left font-semibold">역할</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr
                key={profile.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-medium">
                  {profile.full_name}
                  {profile.id === currentUserId ? (
                    <span className="ml-2 text-xs text-zinc-500">(나)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{profile.job_title ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {formatPhoneForDisplay(profile.phone)}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">저장 중...</p>
      ) : null}
    </div>
  );
}
