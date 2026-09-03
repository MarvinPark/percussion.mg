const MANAGER_HONORIFIC_SUFFIX =
  /\s+(?:전무|상무|이사|부장|차장|과장|대리|주임|팀장|매니저|실장|원장|선생님?|사원|책임|수석|부대표|대표)$/u;

export function stripManagerHonorific(name: string | null | undefined) {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed.replace(MANAGER_HONORIFIC_SUFFIX, "").trim() || trimmed;
}

export function formatQuoteListMemoPreview(
  memo: string | null | undefined,
  maxLength = 10,
) {
  const trimmed = memo?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}
