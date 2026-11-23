/** 세금계산서·Popbill 기준 달력일 (한국 시간). 서버 UTC와 로컬 KST가 어긋나지 않게 합니다. */
const KOREA_TIME_ZONE = "Asia/Seoul";

export function getTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
