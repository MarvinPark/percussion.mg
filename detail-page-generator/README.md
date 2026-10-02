# 퍼커션센터 상세페이지 생성기

고정 템플릿 + 상품 데이터로 쇼핑몰용 상품 상세페이지를 생성하는 관리자 웹앱입니다.

기존 Next.js 경영 시스템(`percussioncenter-management`)과 **별도 패키지**로 동작합니다.

## 실행 방법

```bash
cd detail-page-generator
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 URL(기본 `http://localhost:5173`)을 엽니다.

## 폴더 구조

| 경로 | 역할 |
|------|------|
| `src/admin/` | SaaS 스타일 관리자 화면 |
| `src/detail-page/` | 쇼핑몰용 상세페이지 섹션·테마 (STEP 4+) |
| `src/types/` | 공유 타입 |

## 개발 단계

현재 **STEP 1** — 프로젝트 구조 및 상품 목록 기본 화면.
