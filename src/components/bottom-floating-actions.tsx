"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { btnPrimary } from "@/lib/ui-classes";
import ThemeToggleButton from "@/components/theme-toggle-button";

export default function BottomFloatingActions() {
  const pathname = usePathname();
  const showSalesRegister = pathname === "/sales";

  return (
    <div className="fixed bottom-5 right-4 z-50 flex items-center gap-2">
      {showSalesRegister ? (
        <Link
          href="/sales/new"
          className={`${btnPrimary} !rounded-[9999px] px-6 py-3 min-h-[3rem] text-[15px] shadow-[var(--shadow-card)] backdrop-blur-md`}
        >
          +매출등록
        </Link>
      ) : null}
      <ThemeToggleButton />
    </div>
  );
}
