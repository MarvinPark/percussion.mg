import { createHmac } from "crypto";
import { getEsmCommerceConfig } from "@/lib/esm-commerce/config";

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJwt(
  header: Record<string, string>,
  payload: Record<string, string | number>,
  secretKey: string,
) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secretKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function getEsmCommerceAccessToken() {
  const { masterId, secretKey, gmarketSellerId, tokenIssuer } =
    getEsmCommerceConfig();

  return createJwt(
    {
      alg: "HS256",
      typ: "JWT",
      kid: masterId,
    },
    {
      iss: tokenIssuer,
      sub: "sell",
      aud: "sa.esmplus.com",
      iat: Math.floor(Date.now() / 1000),
      ssi: `G:${gmarketSellerId}`,
    },
    secretKey,
  );
}
