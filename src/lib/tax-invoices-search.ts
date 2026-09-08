import type { TaxInvoiceIssue } from "@/types/tax-invoice";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function filterTaxInvoiceIssuesByIssuer(
  issues: TaxInvoiceIssue[],
  issuer: string,
): TaxInvoiceIssue[] {
  if (!issuer.trim()) return issues;
  return issues.filter(
    (issue) => (issue.issued_by_name?.trim() || "미지정") === issuer,
  );
}

export function filterTaxInvoiceIssuesByPartnerQuery(
  issues: TaxInvoiceIssue[],
  query: string,
): TaxInvoiceIssue[] {
  const q = query.trim().toLowerCase();
  if (!q) return issues;

  return issues.filter((issue) => {
    const haystack = [
      issue.partner_name,
      issue.partner_corp_num,
      issue.partner_email,
      issue.item_name,
    ]
      .map(normalize)
      .filter(Boolean)
      .join(" ");

    return haystack.includes(q);
  });
}

export function filterTaxInvoiceIssues(
  issues: TaxInvoiceIssue[],
  options: { issuer?: string; partnerQuery?: string },
): TaxInvoiceIssue[] {
  let result = issues;
  if (options.issuer?.trim()) {
    result = filterTaxInvoiceIssuesByIssuer(result, options.issuer);
  }
  if (options.partnerQuery?.trim()) {
    result = filterTaxInvoiceIssuesByPartnerQuery(result, options.partnerQuery);
  }
  return result;
}

export function getUniqueTaxInvoiceIssuers(issues: TaxInvoiceIssue[]): string[] {
  const names = new Set<string>();
  for (const issue of issues) {
    names.add(issue.issued_by_name?.trim() || "미지정");
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ko"));
}
