# PERCUSSIONCENTER 관리시스템 — 배포 가이드 (8단계)

회사·외부(휴대폰 포함)에서 **인터넷으로 접속**할 수 있게 올리는 방법입니다.

**구성:** Supabase(데이터·로그인) + Vercel(웹 화면) + GitHub(코드 저장)

---

## 준비물

| 항목 | 설명 |
|------|------|
| Supabase | 이미 사용 중인 프로젝트 |
| GitHub | 코드 저장소 (예: `MarvinPark/percussion.mg`) |
| Vercel | 무료 계정 [vercel.com](https://vercel.com) |

---

## A. 코드 GitHub에 올리기 (최초 1회 + 수정할 때마다)

터미널에서 프로젝트 폴더로 이동 후:

```bash
cd ~/Projects/percussioncenter-management
git add .
git commit -m "배포 준비: 관리시스템 최신 기능 반영"
git push origin main
```

> Vercel은 GitHub에 **올라간 코드**를 기준으로 배포합니다.  
> 로컬에서만 수정하고 push하지 않으면 배포 사이트에는 반영되지 않습니다.

---

## B. Vercel에 배포하기

### 1) 프로젝트 연결 (처음 한 번)

1. [vercel.com](https://vercel.com) 로그인
2. **Add New → Project**
3. GitHub 저장소 **`percussion.mg`** (또는 연결된 repo) 선택 → **Import**
4. Framework: **Next.js** (자동)
5. **Environment Variables** 에 아래 3개 추가:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `NEXT_PUBLIC_APP_URL` | 배포 후 받을 주소 (아래 2) 참고 — 처음엔 비워두고 1차 Deploy 후 넣어도 됨 |

6. **Deploy** 클릭 → 2~3분 대기

### 2) 배포 URL 확인

완료 후 주소 예시:

`https://percussion-mg-xxxxx.vercel.app`

### 3) APP_URL 설정 후 재배포

1. Vercel → Project → **Settings → Environment Variables**
2. `NEXT_PUBLIC_APP_URL` = 위 URL (끝에 `/` 없이)
3. **Deployments → 최신 배포 → ⋯ → Redeploy**

---

## C. Supabase 설정 (로그인·회원가입 필수)

**Authentication → URL Configuration**

| 항목 | 값 |
|------|-----|
| **Site URL** | `https://배포URL.vercel.app` |
| **Redirect URLs** | `https://배포URL.vercel.app/auth/callback` |
| | `https://배포URL.vercel.app/**` |
| | `http://localhost:3000/auth/callback` (로컬 개발용 유지) |

**Authentication → Providers → Email**

- **Enable Email Signup**: ON (직원·외부 가입)
- **Confirm email**:  
  - ON → 가입 후 메일 확인 (권장)  
  - OFF → 바로 로그인 (내부만 쓸 때)

---

## D. DB (새 Supabase / 처음 세팅할 때)

SQL Editor에서 **`supabase/deploy-all.sql`** 전체 Run.

이미 개발 중 DB를 쓰는 경우, 빠진 것만 추가 실행:

- `schema-phase7-admin-policy.sql` (사용자 역할 변경)
- `schema-quotes-conversion.sql` (견적 매출전환)

---

## E. 배포 후 테스트 체크리스트

- [ ] 배포 URL에서 **로그인**
- [ ] **대시보드** / **재고** / **매출** / **견적** 열림
- [ ] 휴대폰 브라우저에서 같은 URL 접속
- [ ] (선택) `/signup` 회원가입 → 로그인
- [ ] (관리자) **사용자** 메뉴에서 역할 변경

---

## F. 커스텀 도메인 (선택)

예: `manage.percussioncenter.co.kr`

1. Vercel → **Settings → Domains** → 도메인 추가
2. DNS 업체에서 Vercel 안내값(CNAME) 설정
3. `NEXT_PUBLIC_APP_URL` → 커스텀 도메인으로 변경 → Redeploy
4. Supabase **Site URL / Redirect URLs** 도 동일 도메인으로 추가

---

## G. 이후 코드 수정 시

```bash
git add .
git commit -m "변경 내용 설명"
git push origin main
```

Vercel이 **자동으로 다시 배포**합니다 (GitHub 연동 시).

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| 로그인 후 튕김 | Supabase Redirect URLs에 `/auth/callback` 포함 |
| 회원가입 메일만 옴 | Confirm email ON → 메일 링크 클릭 후 로그인 |
| 빌드 실패 | Vercel 로그, 환경 변수 2개(Supabase) 최소 설정 |
| DB 오류 | Supabase SQL Logs, `deploy-all.sql` |
| 역할 변경 안 됨 | `schema-phase7-admin-policy.sql` 실행 |

---

## 로컬 개발 (배포와 별개)

```bash
cp .env.local.example .env.local
# Supabase URL·anon key 입력
npm install
npm run dev
```

http://localhost:3000
