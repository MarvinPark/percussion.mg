import bcrypt from "bcryptjs";
import { getNaverCommerceConfig } from "@/lib/naver-commerce/config";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export async function getNaverCommerceAccessToken() {
  const { clientId, clientSecret, apiBase } = getNaverCommerceConfig();
  const timestamp = Date.now();
  const password = `${clientId}_${timestamp}`;
  const hashed = bcrypt.hashSync(password, clientSecret);
  const clientSecretSign = Buffer.from(hashed, "utf-8").toString("base64");

  const body = new URLSearchParams({
    client_id: clientId,
    timestamp: String(timestamp),
    client_secret_sign: clientSecretSign,
    grant_type: "client_credentials",
    type: "SELF",
  });

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await response.json()) as TokenResponse & {
    code?: string;
    message?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.message ?? `네이버 인증 토큰 발급 실패 (${response.status})`,
    );
  }

  return data.access_token;
}
