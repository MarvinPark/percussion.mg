const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const UNITS = ["", "십", "백", "천"];
const BIG_UNITS = ["", "만", "억", "조"];

function readFourDigits(chunk: number): string {
  if (chunk === 0) return "";

  let result = "";
  const thousands = Math.floor(chunk / 1000);
  const hundreds = Math.floor((chunk % 1000) / 100);
  const tens = Math.floor((chunk % 100) / 10);
  const ones = chunk % 10;

  if (thousands > 0) {
    result += thousands === 1 ? "천" : `${DIGITS[thousands]}천`;
  }
  if (hundreds > 0) {
    result += hundreds === 1 ? "백" : `${DIGITS[hundreds]}백`;
  }
  if (tens > 0) {
    result += tens === 1 ? "십" : `${DIGITS[tens]}십`;
  }
  if (ones > 0) {
    result += DIGITS[ones];
  }

  return result;
}

/** 금액을 한글 발음으로 변환 (예: 2500000 → "이백오십만") */
export function numberToKoreanWon(amount: number): string {
  const value = Math.round(Math.max(0, amount));
  if (value === 0) return "영";

  const chunks: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    chunks.push(remaining % 10000);
    remaining = Math.floor(remaining / 10000);
  }

  let result = "";
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunkText = readFourDigits(chunks[i]);
    if (!chunkText) continue;
    result += chunkText + BIG_UNITS[i];
  }

  return result;
}

export function formatKoreanWonLabel(amount: number): string {
  return `${numberToKoreanWon(amount)}원`;
}
