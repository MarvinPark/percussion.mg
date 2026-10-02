const required = '20.19.0'
const requiredMajor22 = 22
const requiredMinor22 = 12

const version = process.versions.node
const [major, minor] = version.split('.').map(Number)

function ok() {
  if (major > requiredMajor22) return true
  if (major === requiredMajor22 && minor >= requiredMinor22) return true
  if (major === 20 && minor >= 19) return true
  return false
}

if (!ok()) {
  console.error(`
[퍼커션센터 상세페이지 생성기] Node.js 버전이 맞지 않습니다.

  현재: v${version}
  필요: v20.19.0 이상 (20.x) 또는 v22.12.0 이상 (22.x)

Vite 8은 Node 18 또는 20.18 이하에서 실행되지 않습니다.

해결 방법 (Mac):
  1) node -v 로 버전 확인
  2) nvm 사용 시:
       nvm install 22
       nvm use 22
  3) detail-page-generator 폴더에서:
       rm -rf node_modules
       npm install
       npm run dev

그래도 안 되면 터미널에 나온 에러 전체를 복사해 주세요.
`)
  process.exit(1)
}
