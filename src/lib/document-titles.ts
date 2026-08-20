import type { Metadata } from "next";

export const APP_DOCUMENT_TITLE = "PERCY";

const EXACT_PAGE_TITLES: Record<string, string> = {
  "/dashboard": "대시보드",
  "/sales": "매출",
  "/sales/new": "매출등록",
  "/sales/payment-methods": "결제수단",
  "/quotes": "견적",
  "/quotes/new": "견적서 작성",
  "/products": "재고",
  "/products/new": "제품등록",
  "/products/stock": "입고/출고",
  "/products/stock/list": "재고현황",
  "/products/history": "변동이력",
  "/products/key-stock": "주요재고",
  "/settings/users": "관리자",
  "/my-page": "마이페이지",
  "/login": "로그인",
  "/signup": "회원가입",
  "/profile/setup": "프로필 설정",
  "/profile/pending-approval": "승인 대기",
};

export function formatDocumentTitle(segment: string): string {
  return `${APP_DOCUMENT_TITLE}-${segment}`;
}

export function resolvePageTitleSegment(pathname: string): string | null {
  if (EXACT_PAGE_TITLES[pathname]) {
    return EXACT_PAGE_TITLES[pathname]!;
  }

  if (/^\/products\/[^/]+\/edit$/.test(pathname)) {
    return "제품수정";
  }

  return null;
}

export function resolveDocumentTitle(pathname: string): string {
  const segment = resolvePageTitleSegment(pathname);
  return segment ? formatDocumentTitle(segment) : APP_DOCUMENT_TITLE;
}

export function createPageMetadata(titleSegment: string): Metadata {
  return { title: titleSegment };
}

export const rootDocumentMetadata: Metadata = {
  title: {
    default: APP_DOCUMENT_TITLE,
    template: `${APP_DOCUMENT_TITLE}-%s`,
  },
  description: "Sales · Inventory · Quotation",
};
