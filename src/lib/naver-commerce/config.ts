const API_BASE = "https://api.commerce.naver.com/external";
const BCRYPT_SALT_PATTERN = /^\$2[aby]\$\d{2}\$/;

export function getNaverCommerceConfig() {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_COMMERCE_CLIENT_ID, NAVER_COMMERCE_CLIENT_SECRET 환경 변수가 필요합니다.",
    );
  }

  if (!BCRYPT_SALT_PATTERN.test(clientSecret)) {
    throw new Error(
      "NAVER_COMMERCE_CLIENT_SECRET 값이 잘못되었습니다. .env.local에서 $ 문자마다 \\$ 로 이스케이프해 주세요. 예: NAVER_COMMERCE_CLIENT_SECRET=\\$2a\\$04\\$...",
    );
  }

  return { clientId, clientSecret, apiBase: API_BASE };
}

export function mapNaverCommerceError(message: string) {
  if (message.includes("Invalid salt version")) {
    return "NAVER_COMMERCE_CLIENT_SECRET 값이 깨졌습니다. .env.local에서 $마다 \\$로 이스케이프해 주세요. 예: NAVER_COMMERCE_CLIENT_SECRET=\\$2a\\$04\\$...";
  }
  if (message.includes("GW.IP_NOT_ALLOWED")) {
    const vercelHint =
      process.env.VERCEL === "1"
        ? " 배포 사이트(Vercel)에서는 PC 공인 IP가 아니라 Vercel Static IP(고정 IP)를 커머스 API 센터에 등록해야 합니다. Vercel → Project Settings → Connectivity → Static IPs에서 IP를 확인하세요."
        : " 로컬에서 사용 중이라면 ifconfig.me 등으로 확인한 본인 공인 IP(IPv4)를 등록하세요.";
    return `API 호출 IP가 허용되지 않습니다. 커머스 API 센터 → 내 스토어 애플리케이션 → 수정 → API호출 IP에 실제 API를 호출하는 서버의 IP를 등록해 주세요.${vercelHint}`;
  }
  if (message.includes("GW.AUTHN") || message.includes("요청을 보낼 권한")) {
    return "네이버 API 주문 조회 권한이 없습니다. 커머스 API 센터 → 내스토어 애플리케이션 → 애플리케이션 상세에서 API 그룹에 「주문 판매자」가 포함되어 있는지 확인해 주세요. 없으면 애플리케이션을 수정해 해당 그룹을 추가한 뒤 다시 시도해 주세요.";
  }
  if (message.includes("전자서명")) {
    return "네이버 API 인증에 실패했습니다. 애플리케이션 ID·시크릿을 확인해 주세요.";
  }
  if (message.includes("24")) {
    return "조회 기간은 최대 24시간 단위입니다. 프로그램이 자동으로 나눠 조회합니다.";
  }
  return message;
}
