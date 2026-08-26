export function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoDateToPopbillDate(isoDate: string) {
  return isoDate.replace(/-/g, "");
}

export function validateTaxInvoiceIsoDate(isoDate: string | undefined | null) {
  const value = isoDate?.trim();
  if (!value) {
    return "날짜를 입력해 주세요.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "날짜 형식이 올바르지 않습니다.";
  }

  if (value > getTodayIsoDate()) {
    return "오늘 또는 과거 날짜만 선택할 수 있습니다.";
  }

  return null;
}
