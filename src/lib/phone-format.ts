export function extractPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatGroupedNumber(digits: string, groups: number[], maxDigits: number) {
  const limited = digits.slice(0, maxDigits);
  const parts: string[] = [];
  let index = 0;

  for (const size of groups) {
    const part = limited.slice(index, index + size);
    if (!part) break;
    parts.push(part);
    index += part.length;
    if (index >= limited.length) break;
  }

  return parts.join("-");
}

function formatMobileOrVoip(digits: string) {
  return formatGroupedNumber(digits, [3, 4, 4], 11);
}

function formatSeoulNumber(digits: string) {
  const limited = digits.slice(0, 10);

  if (limited.length <= 2) return limited;
  if (limited.length === 10) {
    return `02-${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  if (limited.length <= 5) {
    return `02-${limited.slice(2)}`;
  }
  return `02-${limited.slice(2, 5)}-${limited.slice(5)}`;
}

function formatRegionalNumber(digits: string) {
  const limited = digits.slice(0, 11);

  if (limited.length <= 3) return limited;
  if (limited.length === 11) {
    return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
  }
  if (limited.length <= 6) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  }
  return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
}

export function formatPhoneNumber(value: string) {
  const digits = extractPhoneDigits(value);
  if (!digits) return "";
  if (!digits.startsWith("0")) return digits;

  if (digits.startsWith("010") || digits.startsWith("070")) {
    return formatMobileOrVoip(digits);
  }

  if (digits.startsWith("02")) {
    return formatSeoulNumber(digits);
  }

  if (digits.startsWith("01")) {
    return digits.slice(0, 11);
  }

  if (digits.length >= 3) {
    return formatRegionalNumber(digits);
  }

  return digits;
}

export function formatPhoneForDisplay(value: string | null | undefined) {
  if (!value) return "";
  return formatPhoneNumber(value);
}

export const FORMATTED_PHONE_MAX_LENGTH = 13;
