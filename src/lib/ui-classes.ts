/** Shared layout and component class names for consistent UI across the app. */

export const pageMain = "mx-auto max-w-app px-4 py-8 sm:py-10";

/** 매출·견적·재고 등 모바일 FAB(+등록)가 있는 목록 페이지 */
export const pageMainWithMobileFab = `${pageMain} max-md:pb-24`;

export const pageTitle =
  "text-2xl font-bold tracking-tight text-[color:var(--text-heading)]";

export const pageSubtitle =
  "mt-1 text-sm text-indigo-800/75 dark:text-sky-300/85";

export const card =
  "rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export const cardDashed =
  "rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900";

export const cardInteractive =
  "rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:border-accent/40 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-accent/50";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-400";

export const btnPrimarySm =
  "inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400";

export const btnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800";

export const btnSecondarySm =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-normal text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

export const btnGhostSm =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

export const alertError =
  "rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300";

export const alertAccent =
  "rounded-2xl border border-amber-200/80 bg-amber-50/90 p-6 dark:border-amber-900/80 dark:bg-amber-950/60";

export const alertAccentInline =
  "rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/50 dark:text-amber-200";

export const tableShell =
  "overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900";

export const tableHeadRow =
  "border-b border-zinc-200 bg-zinc-50/90 text-left text-indigo-950/85 dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-sky-200/90";

export const inputBase =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

export const sectionAccent =
  "rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30";

export const sectionMuted =
  "rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/80";

/** 예약 상태 — 행·패널 (연두, 견적 예약 버튼과 동일) */
export const reservationRowBg =
  "bg-lime-50/40 hover:bg-lime-50/60 dark:bg-lime-950/15 dark:hover:bg-lime-950/25";

export const reservationRowStickyBg =
  "max-md:bg-lime-50/40 dark:max-md:bg-lime-950/15";

export const reservationPanel =
  "rounded-lg border border-lime-200 bg-lime-50/40 px-3 py-2 dark:border-lime-800/70 dark:bg-lime-950/20";

export const reservationLabel =
  "text-lime-800 dark:text-lime-300";

export const reservationQtyText =
  "text-lime-700 underline decoration-lime-300 decoration-dotted underline-offset-2 dark:text-lime-300 dark:decoration-lime-700";

export const reservationTooltipShell =
  "pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden min-w-[12rem] max-w-xs rounded-lg border border-lime-200 bg-white px-2.5 py-2 text-left shadow-lg group-hover/reservation:block dark:border-lime-800 dark:bg-zinc-900";

export const reservationTooltipBody =
  "space-y-0.5 text-[11px] leading-snug text-lime-900 dark:text-lime-200";

export const reservationEntryChip =
  "truncate rounded bg-lime-100/70 px-1 dark:bg-lime-950/35";

/** 매출취소 등 경고 액션 (주황) */
export const btnSalesCancel =
  "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900";

/** 마진·이익 숫자 (초록) */
export const marginText =
  "text-green-700 dark:text-green-300";

export const marginTextLg = "font-bold text-green-700 dark:text-green-300";
