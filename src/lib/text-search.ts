export const DEFAULT_SEARCH_MIN_TOKEN_LENGTH = 2;

/** 공백으로 분리한 검색 토큰. 각 토큰은 minTokenLength 이상이어야 합니다. */
export function splitSearchTokens(
  query: string,
  minTokenLength = DEFAULT_SEARCH_MIN_TOKEN_LENGTH,
): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const valid = tokens.filter((token) => token.length >= minTokenLength);

  if (valid.length > 0) return valid;
  if (trimmed.length >= minTokenLength) return [trimmed];
  return [];
}

/** haystack에 모든 토큰이 포함되면 true (순서·간격 무관). */
export function matchesTokenSearch(
  haystack: string,
  query: string,
  minTokenLength = DEFAULT_SEARCH_MIN_TOKEN_LENGTH,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const tokens = splitSearchTokens(trimmed, minTokenLength);
  if (tokens.length === 0) return false;

  const normalizedHaystack = haystack.toLowerCase();
  return tokens.every((token) =>
    normalizedHaystack.includes(token.toLowerCase()),
  );
}
