import "server-only";

export type PopbillEnv = {
  linkId: string;
  secretKey: string;
  corpNum: string;
  isTest: boolean;
};

function readPopbillEnv(): PopbillEnv | null {
  const linkId = process.env.POPBILL_LINK_ID?.trim();
  const secretKey = process.env.POPBILL_SECRET_KEY?.trim();
  const corpNum = process.env.POPBILL_CORP_NUM?.replace(/\D/g, "") ?? "";

  if (!linkId || !secretKey || !corpNum) {
    return null;
  }

  return {
    linkId,
    secretKey,
    corpNum,
    isTest: process.env.POPBILL_IS_TEST !== "false",
  };
}

export function getPopbillEnv(): PopbillEnv {
  const env = readPopbillEnv();
  if (!env) {
    throw new Error(
      "Popbill 환경 변수가 설정되지 않았습니다. POPBILL_LINK_ID, POPBILL_SECRET_KEY, POPBILL_CORP_NUM을 .env.local에 추가해 주세요.",
    );
  }
  return env;
}

export function isPopbillConfigured(): boolean {
  return readPopbillEnv() !== null;
}
