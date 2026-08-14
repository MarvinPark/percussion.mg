import Link from "next/link";
import BrandLogo from "@/components/brand-logo";

export default function AppBrandFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-zinc-200/80 bg-background px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] dark:border-zinc-800">
      <Link
        href="/dashboard"
        className="mx-auto flex w-fit opacity-40 transition hover:opacity-70 dark:opacity-35 dark:hover:opacity-60"
        aria-label="PERCUSSION CENTER 홈"
      >
        <BrandLogo
          variant="rectangle"
          className="h-5 w-auto max-w-[9rem] object-center sm:h-6 sm:max-w-[10.5rem]"
        />
      </Link>
    </footer>
  );
}
