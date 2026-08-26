type PopbillCallbackError = {
  code?: number | string;
  message?: string;
};

export function promisifyPopbill<T>(
  invoke: (
    success: (result: T) => void,
    error: (err: PopbillCallbackError) => void,
  ) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    invoke(
      (result) => resolve(result),
      (error) => {
        reject(
          new Error(
            `[${error.code ?? "POPBILL"}] ${error.message ?? "Popbill API 호출 실패"}`,
          ),
        );
      },
    );
  });
}

export type PopbillConnectionTestResult = {
  ok: boolean;
  environment: "test" | "production";
  corpNum: string;
  linkIdPreview: string;
  checks: Array<{
    name: string;
    ok: boolean;
    detail?: string;
    error?: string;
  }>;
};

export async function runPopbillConnectionTest(): Promise<PopbillConnectionTestResult> {
  const linkId = process.env.POPBILL_LINK_ID?.trim() ?? "";
  const secretKey = process.env.POPBILL_SECRET_KEY?.trim() ?? "";
  const corpNum = process.env.POPBILL_CORP_NUM?.replace(/\D/g, "") ?? "";
  const isTest = process.env.POPBILL_IS_TEST !== "false";

  const checks: PopbillConnectionTestResult["checks"] = [];

  if (!linkId || !secretKey || !corpNum) {
    return {
      ok: false,
      environment: isTest ? "test" : "production",
      corpNum,
      linkIdPreview: linkId ? `${linkId.slice(0, 4)}…` : "",
      checks: [
        {
          name: "환경 변수",
          ok: false,
          error:
            "POPBILL_LINK_ID, POPBILL_SECRET_KEY, POPBILL_CORP_NUM을 .env.local에 설정해 주세요.",
        },
      ],
    };
  }

  const popbill = (await import("popbill")).default;

  popbill.config({
    LinkID: linkId,
    SecretKey: secretKey,
    IsTest: isTest,
  });

  const service = popbill.TaxinvoiceService();

  try {
    const unitCost = await promisifyPopbill<number>((success, error) => {
      service.getUnitCost(corpNum, success, error);
    });

    checks.push({
      name: "API 인증 (단가 조회)",
      ok: true,
      detail: `세금계산서 1건 단가: ${unitCost}원`,
    });
  } catch (error) {
    checks.push({
      name: "API 인증 (단가 조회)",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const chargeInfo = await promisifyPopbill<Record<string, unknown>>(
      (success, error) => {
        service.getChargeInfo(corpNum, success, error);
      },
    );

    const balance =
      chargeInfo.balance ??
      chargeInfo.pointBalance ??
      chargeInfo.remainPoint ??
      null;

    checks.push({
      name: "연동회원 / 포인트",
      ok: true,
      detail:
        balance !== null && balance !== undefined
          ? `잔여 포인트: ${balance}`
          : "연동회원 확인됨",
    });
  } catch (error) {
    checks.push({
      name: "연동회원 / 포인트",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const expireDate = await promisifyPopbill<string>((success, error) => {
      service.getCertificateExpireDate(corpNum, success, error);
    });

    checks.push({
      name: "공인인증서",
      ok: true,
      detail: `만료일: ${expireDate}`,
    });
  } catch (error) {
    checks.push({
      name: "공인인증서",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const authOk = checks.some(
    (check) => check.name === "API 인증 (단가 조회)" && check.ok,
  );

  return {
    ok: authOk,
    environment: isTest ? "test" : "production",
    corpNum,
    linkIdPreview: `${linkId.slice(0, 4)}…`,
    checks,
  };
}
