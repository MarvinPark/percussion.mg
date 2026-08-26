import "server-only";

import { getPopbillTaxinvoiceService } from "@/lib/popbill/client";
import { getPopbillEnv } from "@/lib/popbill/env";
import { promisifyPopbill } from "@/lib/popbill/test-connection";

export type PopbillIssueEnvironment = "test" | "production";

export type PopbillReadinessCheck = {
  name: string;
  ok: boolean;
  detail?: string;
  error?: string;
};

export type PopbillIssueStatus = {
  configured: boolean;
  environment: PopbillIssueEnvironment;
  isTest: boolean;
  corpNum: string;
  ready: boolean;
  checks: PopbillReadinessCheck[];
};

export function formatPopbillErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("-99010016")) {
    return "팝빌 상업용 채널이 아직 오픈되지 않았습니다. 팝빌 담당자에게 전자세금계산서 API 상업용 오픈을 요청한 뒤, www.popbill.com 에 연동회원 가입 및 POPBILL_IS_TEST=false 설정을 진행해 주세요.";
  }
  return raw.startsWith("[") ? raw : `세금계산서 발행에 실패했습니다. ${raw}`;
}

function parseCertificateExpiry(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function getPopbillIssueStatus(): Promise<PopbillIssueStatus> {
  const env = getPopbillEnv();
  const checks: PopbillReadinessCheck[] = [];
  const service = getPopbillTaxinvoiceService();

  try {
    const unitCost = await promisifyPopbill<number>((success, error) => {
      service.getUnitCost(env.corpNum, success, error);
    });

    checks.push({
      name: "API 인증",
      ok: true,
      detail: `세금계산서 1건 단가: ${unitCost}원`,
    });
  } catch (error) {
    checks.push({
      name: "API 인증",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await promisifyPopbill<Record<string, unknown>>((success, error) => {
      service.getChargeInfo(env.corpNum, success, error);
    });

    checks.push({
      name: "연동회원",
      ok: true,
      detail: "연동회원 확인됨",
    });
  } catch (error) {
    checks.push({
      name: "연동회원",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const expireDate = await promisifyPopbill<string>((success, error) => {
      service.getCertificateExpireDate(env.corpNum, success, error);
    });
    const expiresAt = parseCertificateExpiry(expireDate);
    const expired = expiresAt !== null && expiresAt < Date.now();

    checks.push({
      name: "공인인증서",
      ok: !expired,
      detail: expired ? undefined : `만료일: ${expireDate}`,
      error: expired ? `공인인증서가 만료되었습니다. (${expireDate})` : undefined,
    });
  } catch (error) {
    checks.push({
      name: "공인인증서",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!env.isTest) {
    checks.push({
      name: "상업용 채널",
      ok: checks.some((check) => check.name === "API 인증" && check.ok),
      detail: checks.some((check) => check.name === "API 인증" && check.ok)
        ? "국세청 실제 신고 가능"
        : undefined,
      error: checks.some((check) => check.name === "API 인증" && check.ok)
        ? undefined
        : "팝빌 상업용 채널 오픈 및 www.popbill.com 연동회원 가입이 필요합니다.",
    });
  } else {
    checks.push({
      name: "발행 환경",
      ok: true,
      detail: "테스트 환경 (국세청 가상 신고)",
    });
  }

  const apiOk = checks.some((check) => check.name === "API 인증" && check.ok);
  const certOk = checks.some((check) => check.name === "공인인증서" && check.ok);
  const ready = apiOk && certOk;

  return {
    configured: true,
    environment: env.isTest ? "test" : "production",
    isTest: env.isTest,
    corpNum: env.corpNum,
    ready,
    checks,
  };
}

export async function assertPopbillReadyForIssue() {
  const status = await getPopbillIssueStatus();

  if (!status.ready) {
    const failed = status.checks.filter((check) => !check.ok);
    const message = failed
      .map((check) => `${check.name}: ${check.error ?? "확인 필요"}`)
      .join(" / ");
    return { error: message || "Popbill 발행 준비가 완료되지 않았습니다." };
  }

  return { status };
}
