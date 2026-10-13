"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { scheduleNavigationFallback } from "@/lib/client-navigation-fallback";

type AppNavLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

function shouldUseFullPageNavigation(href: string, pathname: string) {
  return (
    href.startsWith("/documents") || pathname.startsWith("/documents")
  );
}

/** App Router 전환이 멈출 때 전체 페이지 이동으로 이어갑니다. */
export default function AppNavLink({
  href,
  className,
  children,
}: AppNavLinkProps) {
  const pathname = usePathname();

  if (shouldUseFullPageNavigation(href, pathname)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={() => scheduleNavigationFallback(href)}
    >
      {children}
    </Link>
  );
}
