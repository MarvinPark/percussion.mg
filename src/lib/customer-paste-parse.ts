import { extractPhoneDigits } from "@/lib/phone-format";

export type ParsedCustomerContact = {
  name?: string;
  phone?: string;
  address?: string;
};

const PHONE_IN_TEXT =
  /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}|01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/;

const ADDRESS_HINT =
  /(?:특별|광역|특별자치)?[가-힣]+(?:시|도)\s|[가-힣]+(?:시|군|구)\s|[가-힣]+(?:읍|면|동|리)\s|[가-힣\d\s]+(?:로|길)\s*\d|\(\d{5}\)|번지/;

function looksLikePhone(text: string) {
  const digits = extractPhoneDigits(text);
  if (digits.length < 8) return false;

  const nonPhoneChars = text.replace(/[\d\s\-().+]/g, "").trim();
  return nonPhoneChars.length === 0;
}

function looksLikeAddress(text: string) {
  if (looksLikePhone(text)) return false;
  if (ADDRESS_HINT.test(text)) return true;
  return text.length >= 12 && /[가-힣]/.test(text);
}

function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSingleLine(line: string): ParsedCustomerContact | null {
  const phoneMatch = line.match(PHONE_IN_TEXT);
  if (!phoneMatch || phoneMatch.index === undefined) return null;

  const phone = extractPhoneDigits(phoneMatch[0]);
  const before = line.slice(0, phoneMatch.index).replace(/[,，·|/]\s*$/, "").trim();
  const after = line
    .slice(phoneMatch.index + phoneMatch[0].length)
    .replace(/^[,，·|/\s]+/, "")
    .trim();

  const result: ParsedCustomerContact = { phone };
  if (before) result.name = before;
  if (after) result.address = after;

  return result.name || result.address ? result : null;
}

function filledFieldCount(parsed: ParsedCustomerContact) {
  return [parsed.name, parsed.phone, parsed.address].filter(Boolean).length;
}

export function parseCustomerContactPaste(raw: string): ParsedCustomerContact | null {
  const text = raw.trim();
  if (!text) return null;

  const lines = splitLines(text);

  if (lines.length === 1) {
    const parsed = parseSingleLine(lines[0]);
    if (!parsed || filledFieldCount(parsed) < 2) return null;
    return parsed;
  }

  const parsed: ParsedCustomerContact = {};
  const remaining: string[] = [];

  for (const line of lines) {
    if (!parsed.phone && looksLikePhone(line)) {
      parsed.phone = extractPhoneDigits(line);
      continue;
    }

    if (!parsed.address && looksLikeAddress(line)) {
      parsed.address = line;
      continue;
    }

    remaining.push(line);
  }

  if (!parsed.name && remaining.length > 0) {
    const nameLine =
      remaining.find((line) => !looksLikeAddress(line) && line.length <= 40) ??
      remaining[0];
    parsed.name = nameLine;

    if (!parsed.address) {
      const addressLine = remaining.find(
        (line) => line !== nameLine && looksLikeAddress(line),
      );
      if (addressLine) parsed.address = addressLine;
    }
  }

  if (filledFieldCount(parsed) < 2) return null;
  return parsed;
}
