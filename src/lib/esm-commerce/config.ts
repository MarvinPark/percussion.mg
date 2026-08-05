export function getEsmCommerceConfig() {
  const masterId = process.env.ESM_MASTER_ID?.trim();
  const secretKey = process.env.ESM_SECRET_KEY?.trim();
  const gmarketSellerId = process.env.ESM_GMARKET_SELLER_ID?.trim();
  const tokenIssuer = process.env.ESM_TOKEN_ISSUER?.trim() || "www.esmplus.com";

  if (!masterId || !secretKey || !gmarketSellerId) {
    throw new Error(
      "지마켓 API 설정이 없습니다. .env.local에 ESM_MASTER_ID, ESM_SECRET_KEY, ESM_GMARKET_SELLER_ID를 입력해 주세요.",
    );
  }

  return {
    apiBase: "https://sa2.esmplus.com",
    masterId,
    secretKey,
    gmarketSellerId,
    tokenIssuer,
    siteType: 2 as const,
  };
}

export function mapEsmCommerceError(message: string) {
  if (message.includes("ESM_MASTER_ID")) return message;
  if (message.includes("401") || message.includes("Unauthorized")) {
    return "지마켓 API 인증에 실패했습니다. ESM Master ID, Secret Key, 판매자 ID를 확인해 주세요.";
  }
  if (message.includes("5초당 1회")) {
    return "지마켓 주문 조회는 5초당 1회만 가능합니다. 잠시 후 다시 시도해 주세요.";
  }
  return message;
}
