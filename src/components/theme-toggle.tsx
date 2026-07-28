"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
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
      <div className="fixed bottom-4 right-4 z-50 h-10 w-24 rounded-full border border-zinc-300 bg-white/90" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white/95 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-md backdrop-blur transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/95 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
