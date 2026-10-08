const NAVIGATION_FALLBACK_MS = 600;

/** App Router 전환이 멈출 때 전체 페이지 이동으로 이어갑니다. */
export function scheduleNavigationFallback(href: string) {
  window.setTimeout(() => {
    try {
      const target = new URL(href, window.location.href);
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const destination = `${target.pathname}${target.search}${target.hash}`;
      if (current !== destination) {
        window.location.assign(destination);
      }
    } catch {
      window.location.assign(href);
    }
  }, NAVIGATION_FALLBACK_MS);
}
