#!/usr/bin/env node
/**
 * Popbill 연결 테스트 (로컬)
 * 사용: node --env-file=.env.local scripts/test-popbill-connection.mjs
 */

import popbill from "popbill";

function promisify(invoke) {
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

async function runPopbillConnectionTest() {
  const linkId = process.env.POPBILL_LINK_ID?.trim() ?? "";
  const secretKey = process.env.POPBILL_SECRET_KEY?.trim() ?? "";
  const corpNum = process.env.POPBILL_CORP_NUM?.replace(/\D/g, "") ?? "";
  const isTest = process.env.POPBILL_IS_TEST !== "false";
  const checks = [];

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

  popbill.config({
    LinkID: linkId,
    SecretKey: secretKey,
    IsTest: isTest,
  });

  const service = popbill.TaxinvoiceService();

  try {
    const unitCost = await promisify((success, error) => {
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
    const chargeInfo = await promisify((success, error) => {
      service.getChargeInfo(corpNum, success, error);
    });
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
    const expireDate = await promisify((success, error) => {
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

function printResult(result) {
  console.log("");
  console.log("=== Popbill 연결 테스트 ===");
  console.log(
    `환경: ${result.environment === "test" ? "개발(test)" : "상업(production)"}`,
  );
  console.log(`사업자번호: ${result.corpNum}`);
  console.log(`LinkID: ${result.linkIdPreview}`);
  console.log(`종합: ${result.ok ? "성공 (API 인증 OK)" : "실패"}`);
  console.log("");

  for (const check of result.checks) {
    const mark = check.ok ? "✓" : "✗";
    console.log(`${mark} ${check.name}`);
    if (check.detail) console.log(`  ${check.detail}`);
    if (check.error) console.log(`  ${check.error}`);
  }

  console.log("");
}

const result = await runPopbillConnectionTest();
printResult(result);
process.exit(result.ok ? 0 : 1);
