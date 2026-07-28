# PERCUSSIONCENTER 관리시스템 — 배포 가이드

회사 내부·외부(재택, 거래처 등)에서 **인터넷으로 접속**해 사용할 수 있도록 배포하는 방법입니다.

권장 구성: **Supabase(데이터·로그인) + Vercel(웹 앱)**

---

## 1. Supabase 프로덕션 설정

### 1-1. 프로젝트 확인
이미 개발용 Supabase를 쓰고 있다면 그대로 사용해도 되고, 운영 전용 프로젝트를 새로 만들어도 됩니다.

### 1-2. DB 스키마 한 번에 적용
Supabase 대시보드 → **SQL Editor** → New query

`supabase/deploy-all.sql` 파일 전체를 붙여넣고 **Run** 합니다.

> 이미 일부 SQL을 실행했다면, `add column if not exists` 등은 중복 실행해도 대부분 안전합니다.

### 1-3. Authentication 설정
**Authentication → URL Configuration**

| 항목 | 값 (예시) |
|------|-----------|
| Site URL | `https://your-domain.vercel.app` 또는 커스텀 도메인 |
| Redirect URLs | `https://your-domain.vercel.app/auth/callback` |
| | `https://your-domain.vercel.app/**` |
| | `http://localhost:3000/auth/callback` (로컬 개발용) |

**Authentication → Providers → Email**
- **Enable Email Signup**: 켜기 (외부 사용자 회원가입)
- **Confirm email**:  
  - **켜기** → 가입 후 이메일 확인 필요 (보안 권장)  
  - **끄기** → 바로 로그인 (내부만 쓸 때 간편)

**Authentication → Email Templates**  
발신 이름·로고 등 필요 시 수정

### 1-4. API 키 복사
**Project Settings → API**
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Vercel에 웹 앱 배포

### 2-1. GitHub에 코드 올리기
```bash
cd ~/Projects/percussioncenter-management
git init
git add .
git commit -m "Initial commit: PERCUSSIONCENTER management system"
# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/YOUR_ORG/percussioncenter-management.git
git push -u origin main
```

### 2-2. Vercel 연결
1. [vercel.com](https://vercel.com) 로그인
2. **Add New → Project**
3. GitHub 저장소 import
4. Framework: **Next.js** (자동 감지)
5. **Environment Variables** 추가:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | `https://배포된-도메인.vercel.app` (배포 후 실제 URL) |

6. **Deploy**

### 2-3. 배포 후
1. Vercel에서 부여된 URL 확인 (예: `https://percussioncenter-management.vercel.app`)
2. `NEXT_PUBLIC_APP_URL`을 해당 URL로 설정 후 **Redeploy**
3. Supabase **Site URL / Redirect URLs**에도 같은 도메인 등록

---

## 3. 커스텀 도메인 (선택)

회사 도메인 예: `manage.percussioncenter.co.kr`

1. Vercel → Project → **Settings → Domains** → 도메인 추가
2. DNS에 Vercel 안내값(CNAME 등) 설정
3. `NEXT_PUBLIC_APP_URL`을 커스텀 도메인으로 변경 후 Redeploy
4. Supabase Redirect URLs에 커스텀 도메인 추가

---

## 4. 사용 방법 (직원·외부)

| 대상 | 접속 |
|------|------|
| 직원 | 배포 URL → 회원가입 또는 관리자가 계정 안내 |
| 외부 협력 | 동일 URL → 회원가입 후 로그인 |

- **회원가입**: `/signup`
- **로그인**: `/login`
- 로그인한 사용자는 **같은 재고·매출·견적 데이터**를 공유합니다 (팀 공용 DB)

> 외부인에게 데이터 노출을 제한하려면 Supabase RLS 정책을 별도로 설계해야 합니다. 현재는 **로그인한 모든 사용자가 전체 데이터 조회·수정** 가능합니다.

---

## 5. 로컬 개발

```bash
cp .env.local.example .env.local
# .env.local에 Supabase 값 입력
npm install
npm run dev
```

---

## 6. 체크리스트

- [ ] `supabase/deploy-all.sql` 실행 완료
- [ ] Vercel 환경 변수 3개 설정
- [ ] Supabase Site URL / Redirect URLs 설정
- [ ] 배포 URL에서 회원가입·로그인 테스트
- [ ] 대시보드 / 재고 / 매출 / 견적 / 주요재고현황 동작 확인
- [ ] (선택) 커스텀 도메인 연결

---

## 7. 문제 해결

| 증상 | 확인 |
|------|------|
| 로그인 후 바로 튕김 | Supabase Redirect URLs에 `/auth/callback` 포함 여부 |
| 회원가입 후 메일만 옴 | Email Confirm 켜진 상태 → 메일 링크 클릭 후 로그인 |
| DB 오류 | `deploy-all.sql` 재실행, Supabase Logs 확인 |
| 빌드 실패 | Vercel 빌드 로그, 환경 변수 누락 여부 |

문의·수정은 개발 담당자에게 연락하세요.
