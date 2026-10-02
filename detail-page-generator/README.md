# 퍼커션센터 상세페이지 생성기

고정 템플릿 + 상품 데이터로 쇼핑몰용 상품 상세페이지를 생성하는 관리자 웹앱입니다.

기존 Next.js 경영 시스템(`percussioncenter-management`)과 **별도 패키지**로 동작합니다.

## 사전 요구사항

- **Node.js** `20.19` 이상 또는 **`22.12` 이상** (Vite 8 필수)
- Node 18 / 20.18 이하에서는 `npm run dev`가 실패합니다.

```bash
node -v   # 예: v22.17.0
```

`.nvmrc`에 `22`가 있으면 `nvm use`로 맞출 수 있습니다.

## 실행 방법

저장소 **최신 `main`을 pull**한 뒤, **반드시 `detail-page-generator` 폴더 안에서** 실행합니다.

**명령은 한 줄씩** 실행하세요. (`cd`와 `npm`을 같은 줄에 쓰면 `cd: too many arguments`가 납니다.)

```bash
cd ~/Projects/percussioncenter-management
git pull origin main
cd detail-page-generator
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 URL(기본 `http://localhost:5173`)을 엽니다.

`npm`이 `/Users/mac/package.json`을 찾는다면 **홈 폴더에서 실행 중**입니다. 위 `cd`로 저장소 → `detail-page-generator`까지 이동한 뒤 다시 `npm install` 하세요.

### 자주 나는 오류

| 증상 | 원인 | 조치 |
|------|------|------|
| `not a git repository` | git 저장소 밖(홈 등)에서 pull | 먼저 `cd`로 `percussioncenter-management` 이동 |
| `Could not read package.json` / `ENOENT` | `detail-page-generator` 밖에서 npm 실행 | `pwd` 확인 후 `cd detail-page-generator` |
| `cd: too many arguments` | 여러 명령을 한 줄에 붙임 | 한 줄에 명령 하나씩 |
| Node / Vite engine 오류 | Node 버전 낮음 | Node 22 LTS 설치 후 `rm -rf node_modules && npm install` |
| `EADDRINUSE 5173` | 포트 사용 중 | 다른 dev 서버 종료 또는 `npm run dev -- --port 5174` |

## 폴더 구조

| 경로 | 역할 |
|------|------|
| `src/admin/` | SaaS 스타일 관리자 화면 |
| `src/detail-page/` | 쇼핑몰용 상세페이지 섹션·테마 (STEP 4+) |
| `src/types/` | 공유 타입 |

## 개발 단계

- **STEP 1** — 프로젝트 구조 및 상품 목록
- **STEP 2** — 상품 입력 폼 (`/products/new`, `/products/:id/edit`), 브라우저 localStorage 저장
- **STEP 3+** — 실시간 미리보기, 섹션·테마, Supabase 등 (진행 예정)

데이터는 당분간 **localStorage**에 저장됩니다 (STEP 9에서 Supabase로 이전).
