import {
  FIELD_ALIASES,
  normalizeHeader,
  type ColumnMapping,
  type ProductFieldKey,
} from "@/lib/excel-field-keys";

function scoreHeader(header: string, aliases: string[]) {
  const normalized = normalizeHeader(header);
  if (!normalized) return 0;

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    if (normalized === normalizedAlias) return 100;
    if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
      return 80;
    }
  }

  return 0;
}

export function mapColumnsHeuristic(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedHeaders = new Set<string>();

  (Object.keys(FIELD_ALIASES) as ProductFieldKey[]).forEach((field) => {
    let bestHeader: string | null = null;
    let bestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const score = scoreHeader(header, FIELD_ALIASES[field]);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestHeader && bestScore >= 80) {
      mapping[field] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  });

  return mapping;
}

export function mappingConfidence(mapping: ColumnMapping) {
  const hasIdentifier = Boolean(mapping.sku || mapping.model_name || mapping.product_name);
  const hasUpdatable = Boolean(
    mapping.purchase_price ||
      mapping.sale_price ||
      mapping.stock_quantity ||
      mapping.supplier ||
      mapping.category ||
      mapping.brand ||
      mapping.product_name ||
      mapping.model_name ||
      mapping.sku ||
      mapping.color ||
      mapping.product_option ||
      mapping.size,
  );

  return {
    hasIdentifier,
    hasUpdatable,
    isUsable: hasIdentifier && hasUpdatable,
    mappedCount: Object.keys(mapping).length,
  };
}

export async function mapColumnsWithAi(
  headers: string[],
  sampleRows: Record<string, unknown>[],
): Promise<ColumnMapping | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You map spreadsheet columns to inventory product fields. Return JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task:
                "Map each product field to one of the provided spreadsheet column headers. Use null when no match.",
              fields: [
                "supplier",
                "category",
                "brand",
                "product_name",
                "model_name",
                "sku",
                "color",
                "product_option",
                "size",
                "purchase_price",
                "sale_price",
                "stock_quantity",
                "min_stock_quantity",
              ],
              headers,
              sampleRows: sampleRows.slice(0, 3),
            }),
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Record<string, string | null>;
    const mapping: ColumnMapping = {};

    (Object.keys(parsed) as ProductFieldKey[]).forEach((field) => {
      const header = parsed[field];
      if (header && headers.includes(header)) {
        mapping[field] = header;
      }
    });

    return mapping;
  } catch {
    return null;
  }
}

export async function resolveColumnMapping(
  headers: string[],
  sampleRows: Record<string, unknown>[],
) {
  const heuristic = mapColumnsHeuristic(headers);
  const heuristicConfidence = mappingConfidence(heuristic);

  if (heuristicConfidence.isUsable) {
    return { mapping: heuristic, usedAi: false };
  }

  const aiMapping = await mapColumnsWithAi(headers, sampleRows);
  if (aiMapping) {
    const aiConfidence = mappingConfidence(aiMapping);
    if (aiConfidence.isUsable) {
      return { mapping: aiMapping, usedAi: true };
    }
  }

  return {
    mapping: heuristic,
    usedAi: false,
    error:
      "엑셀 열을 자동으로 이해하지 못했습니다. SKU 또는 모델명과 수정할 항목(가격/재고 등)이 포함되어 있는지 확인해 주세요.",
  };
}
