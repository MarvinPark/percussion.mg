type AppBrandTitleProps = {
  align?: "left" | "center";
  className?: string;
};

export default function AppBrandTitle({
  align = "left",
  className = "",
}: AppBrandTitleProps) {
  return (
    <div
      className={`flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:gap-x-3 ${
        align === "center" ? "justify-center" : ""
      } ${className}`}
    >
      <p className="shrink-0 text-base font-black leading-none tracking-tight text-[color:var(--text-heading)] sm:text-lg">
        PERCY
      </p>
      <p className="text-[10px] font-medium leading-none whitespace-nowrap sm:text-[11px]">
        <span className="text-blue-700/85 dark:text-blue-300/90">Sales</span>
        <span className="text-accent/80" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        <span className="text-emerald-700/85 dark:text-emerald-300/90">
          Inventory
        </span>
        <span className="text-accent/80" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        <span className="text-violet-700/85 dark:text-violet-300/90">
          Quotation
        </span>
      </p>
    </div>
  );
}
