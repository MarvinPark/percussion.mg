import {
  formatUsageMegabytes,
  type MonthlyUsageSummary,
} from "@/lib/app-usage";

type AppHeaderUsageProps = {
  usage: MonthlyUsageSummary;
  className?: string;
};

export default function AppHeaderUsage({
  usage,
  className = "hidden items-center gap-1 whitespace-nowrap text-[10px] font-extralight tracking-tight lg:inline-flex",
}: AppHeaderUsageProps) {
  const dbLabel = formatUsageMegabytes(usage.databaseBytes);
  const dbIsHigh =
    usage.databaseBytes !== null &&
    usage.databaseBytes >= 400 * 1024 * 1024;

  return (
    <span
      className={className}
      aria-label={`${usage.monthLabel}월 PERCY 사용량`}
    >
      <span className="text-sky-600 dark:text-sky-400">
        {usage.monthLabel}월 등록 {usage.productRegisters.toLocaleString("ko-KR")}
      </span>
      <span className="font-thin text-zinc-300 dark:text-zinc-600">·</span>
      <span className="text-red-500 dark:text-red-400">
        다운 {usage.excelDownloads.toLocaleString("ko-KR")}
      </span>
      <span className="font-thin text-zinc-300 dark:text-zinc-600">·</span>
      <span className="text-sky-600 dark:text-sky-400">
        매출 {usage.sales.toLocaleString("ko-KR")}
      </span>
      <span className="font-thin text-zinc-300 dark:text-zinc-600">·</span>
      <span className="text-red-500 dark:text-red-400">
        견적 {usage.quotes.toLocaleString("ko-KR")}
      </span>
      <span className="font-thin text-zinc-300 dark:text-zinc-600">·</span>
      <span
        className={
          dbIsHigh
            ? "text-red-500 dark:text-red-400"
            : "text-sky-600 dark:text-sky-400"
        }
      >
        DB {dbLabel}
      </span>
    </span>
  );
}
