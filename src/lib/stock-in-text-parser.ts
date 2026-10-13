export type StockInTextParseError = {
  lineNumber: number;
  text: string;
  message: string;
};

export type MergedStockInTextLine = {
  sku: string;
  quantity: number;
  lineNumbers: number[];
};

export type StockInTextParseResult = {
  lines: MergedStockInTextLine[];
  errors: StockInTextParseError[];
};

function parseQuantityToken(raw: string): number | null {
  const match = raw.trim().match(/^(\d+)\s*(?:ea|EA|개)?$/i);
  if (!match) return null;
  const quantity = Number(match[1]);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return Math.round(quantity);
}

function parseStockInTextLine(
  lineNumber: number,
  rawLine: string,
): { sku: string; quantity: number } | StockInTextParseError | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return null;
  }

  let skuPart = "";
  let qtyPart = "";

  if (trimmed.includes("*")) {
    const segments = trimmed.split("*").map((part) => part.trim());
    if (segments.length !== 2 || !segments[0] || !segments[1]) {
      return {
        lineNumber,
        text: rawLine,
        message: "「모델번호 * 수량」 형식이 아닙니다.",
      };
    }
    skuPart = segments[0];
    qtyPart = segments[1];
  } else {
    const match = trimmed.match(/^(.+?)\s+(\d+\s*(?:ea|EA|개)?)$/i);
    if (!match) {
      return {
        lineNumber,
        text: rawLine,
        message: "「모델번호 수량」 형식으로 입력해 주세요.",
      };
    }
    skuPart = match[1].trim();
    qtyPart = match[2];
  }

  if (!skuPart) {
    return {
      lineNumber,
      text: rawLine,
      message: "모델번호(SKU)가 비어 있습니다.",
    };
  }

  const quantity = parseQuantityToken(qtyPart);
  if (quantity === null) {
    return {
      lineNumber,
      text: rawLine,
      message: "수량은 1 이상의 숫자(또는 2ea 형식)여야 합니다.",
    };
  }

  return { sku: skuPart, quantity };
}

/** 동일 SKU는 수량을 합칩니다. */
export function parseStockInText(raw: string): StockInTextParseResult {
  const rows = raw.split(/\r?\n/);
  const errors: StockInTextParseError[] = [];
  const merged = new Map<string, MergedStockInTextLine>();

  for (let index = 0; index < rows.length; index += 1) {
    const lineNumber = index + 1;
    const parsed = parseStockInTextLine(lineNumber, rows[index] ?? "");
    if (parsed === null) continue;
    if ("message" in parsed) {
      errors.push(parsed);
      continue;
    }

    const key = parsed.sku.trim();
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += parsed.quantity;
      existing.lineNumbers.push(lineNumber);
    } else {
      merged.set(key, {
        sku: key,
        quantity: parsed.quantity,
        lineNumbers: [lineNumber],
      });
    }
  }

  return {
    lines: [...merged.values()],
    errors,
  };
}
