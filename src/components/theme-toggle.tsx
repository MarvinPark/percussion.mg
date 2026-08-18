"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isWorkspacePath } from "@/lib/workspace-tabs";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const pathname = usePathname();
  const aboveWorkspaceTabs = isWorkspacePath(pathname);
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial: Theme = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  if (!mounted) {
    return (
      <div
        className={`fixed right-4 z-50 h-10 w-24 rounded-full border border-zinc-300 bg-white/90 ${
          aboveWorkspaceTabs
            ? "bottom-[calc(var(--workspace-tabs-height)+1rem+env(safe-area-inset-bottom,0px))]"
            : "bottom-4"
        }`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
      className={`fixed right-4 z-50 flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-[var(--shadow-card)] backdrop-blur-md transition hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 ${
        aboveWorkspaceTabs
          ? "bottom-[calc(var(--workspace-tabs-height)+1rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-5"
      }`}
    >
      {theme === "light" ? (
        <>
          <span aria-hidden="true">🌙</span>
          다크
        </>
      ) : (
        <>
          <span aria-hidden="true">☀️</span>
          라이트
        </>
      )}
    </button>
  );
}
