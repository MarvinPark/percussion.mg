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
  supplier: string | null;
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

function tryParseSupplierLine(
  lineNumber: number,
  rawLine: string,
): { supplier: string } | StockInTextParseError | null {
  const trimmed = rawLine.trim();
  if (!/^매입처\s*[:：]/iu.test(trimmed)) {
    return null;
  }

  const match = trimmed.match(/^매입처\s*[:：]\s*(.+)$/iu);
  if (!match?.[1]?.trim()) {
    return {
      lineNumber,
      text: rawLine,
      message: "매입처 이름을 입력해 주세요. (예: 매입처: KSV)",
    };
  }

  return { supplier: match[1].trim() };
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
    const starIndex = trimmed.indexOf("*");
    skuPart = trimmed.slice(0, starIndex).trim();
    qtyPart = trimmed.slice(starIndex + 1).trim();
    if (!skuPart || !qtyPart) {
      return {
        lineNumber,
        text: rawLine,
        message: "「모델명 * 수량」 형식이 아닙니다.",
      };
    }
  } else {
    const match = trimmed.match(/^(.+?)\s+(\d+\s*(?:ea|EA|개)?)$/i);
    if (!match) {
      return {
        lineNumber,
        text: rawLine,
        message: "「모델명 수량」 형식으로 입력해 주세요.",
      };
    }
    skuPart = match[1].trim();
    qtyPart = match[2];
  }

  if (!skuPart) {
    return {
      lineNumber,
      text: rawLine,
      message: "모델명(SKU)이 비어 있습니다.",
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

/** 동일 모델·SKU 키는 수량을 합칩니다. 첫 줄 `매입처:` 는 공급처 필터로 사용합니다. */
export function parseStockInText(raw: string): StockInTextParseResult {
  const rows = raw.split(/\r?\n/);
  const errors: StockInTextParseError[] = [];
  const merged = new Map<string, MergedStockInTextLine>();
  let supplier: string | null = null;

  for (let index = 0; index < rows.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = rows[index] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }

    const supplierLine = tryParseSupplierLine(lineNumber, rawLine);
    if (supplierLine !== null) {
      if ("message" in supplierLine) {
        errors.push(supplierLine);
        continue;
      }
      if (supplier !== null) {
        errors.push({
          lineNumber,
          text: rawLine,
          message: "매입처는 한 번만 지정할 수 있습니다.",
        });
        continue;
      }
      supplier = supplierLine.supplier;
      continue;
    }

    const parsed = parseStockInTextLine(lineNumber, rawLine);
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
    supplier,
    lines: [...merged.values()],
    errors,
  };
}
