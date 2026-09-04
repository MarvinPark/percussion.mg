export function SettingsSectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-10 rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80"
        />
      ))}
    </div>
  );
}

export function SettingsCompactSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden>
      <div className="h-8 rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="h-24 rounded-lg bg-zinc-200/60 dark:bg-zinc-800/60" />
    </div>
  );
}
