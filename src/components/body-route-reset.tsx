"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** 페이지 이동 후 남은 body 스타일(스크롤 잠금·리사이즈 등)을 초기화합니다. */
export default function BodyRouteReset() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, [pathname]);

  return null;
}
