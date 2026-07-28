# PERCUSSIONCENTER 관리시스템

재고 · 매출 · 견적 · 주요재고를 한곳에서 관리하는 Next.js + Supabase 웹 앱입니다.

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # Supabase 값 입력
npm run dev
```

http://localhost:3000

## 배포 (회사·외부 접속)

**[DEPLOY.md](./DEPLOY.md)** 를 참고하세요.

1. Supabase에 `supabase/deploy-all.sql` 실행
2. GitHub → Vercel 배포
3. Supabase Auth URL / Redirect URLs 설정
4. 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`

## 주요 기능

- 재고관리 (위치별 재고, 주요재고, 주요재고현황)
- 매출관리
- 견적관리
- 로그인 / 회원가입 (외부 사용자 포함)
