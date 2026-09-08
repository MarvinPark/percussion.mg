/**
 * 예상하지 못한 예외를 화면과 로그에 남길 수 있는 문자열로 바꿉니다.
 *
 * 프로덕션 빌드에서 Next.js는 서버에서 발생한 예외 메시지를 클라이언트로
 * 보내지 않고 digest만 남깁니다. 서버 로그와 대조하려면 그 digest가 필요하므로
 * 메시지와 함께 표시합니다.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const digest = (error as { digest?: unknown }).digest;
    const suffix = typeof digest === "string" ? ` (digest: ${digest})` : "";
    return `${error.message || error.name}${suffix}`;
  }

  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * redirect()·notFound() 처럼 Next.js가 제어 흐름 용도로 던지는 예외인지 확인합니다.
 * 서버 액션을 try/catch로 감쌀 때 이런 예외는 삼키지 말고 다시 던져야 합니다.
 */
export function isNextControlFlowError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}
