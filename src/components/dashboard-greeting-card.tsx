"use client";

import { useState } from "react";
import { pickRandomDashboardGreetingStyle } from "@/lib/dashboard-greetings";
import { card } from "@/lib/ui-classes";

type DashboardGreetingCardProps = {
  displayName: string;
  fullName?: string | null;
  jobTitle?: string | null;
  email: string;
};

export default function DashboardGreetingCard({
  displayName,
  fullName,
  jobTitle,
  email,
}: DashboardGreetingCardProps) {
  const [{ greeting, colorClass }] = useState(() =>
    pickRandomDashboardGreetingStyle(displayName),
  );

  const metaLine = [email, fullName?.trim(), jobTitle?.trim()].filter(Boolean);

  return (
    <div
      className={`${card} border-t-2 border-t-accent/40 !px-5 !py-3`}
    >
      <h2 className={`text-xl font-semibold leading-snug ${colorClass}`}>
        {greeting}
      </h2>
      {metaLine.length > 0 ? (
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          {metaLine.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
