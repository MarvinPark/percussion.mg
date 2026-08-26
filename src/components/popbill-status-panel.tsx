import type { PopbillIssueStatus } from "@/lib/popbill/readiness";

type PopbillStatusPanelProps = {
  status: PopbillIssueStatus;
  compact?: boolean;
};

export default function PopbillStatusPanel({
  status,
  compact = false,
}: PopbillStatusPanelProps) {
  const environmentLabel = status.isTest ? "테스트" : "운영";
  const environmentClass = status.isTest
    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    : status.ready
      ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
      : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${environmentClass} ${
        compact ? "" : "mb-4"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          Popbill 발행 환경: {environmentLabel}
        </p>
        <span className="text-xs opacity-80">사업자번호 {status.corpNum}</span>
      </div>
      <p className="mt-1">
        {status.isTest
          ? "현재 테스트 환경입니다. 발행은 되지만 국세청에는 가상 신고됩니다."
          : status.ready
            ? "운영 환경입니다. 발행 시 국세청에 실제 신고됩니다."
            : "운영 환경이 설정되었지만 팝빌 상업용 채널이 아직 준비되지 않았습니다."}
      </p>
      {!compact ? (
        <ul className="mt-3 space-y-1 text-xs">
          {status.checks.map((check) => (
            <li key={check.name}>
              {check.ok ? "✓" : "✗"} {check.name}
              {check.detail ? ` — ${check.detail}` : ""}
              {check.error ? ` — ${check.error}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {status.isTest ? (
        <p className="mt-3 text-xs leading-relaxed opacity-90">
          실제 국세청 신고를 하려면 팝빌에 전자세금계산서 API 상업용 오픈을 요청하고,
          www.popbill.com 연동회원 가입 후{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            POPBILL_IS_TEST=false
          </code>
          로 설정하세요.
        </p>
      ) : null}
    </div>
  );
}
