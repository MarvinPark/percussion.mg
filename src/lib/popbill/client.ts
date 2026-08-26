import "server-only";

import popbill from "popbill";
import { getPopbillEnv } from "@/lib/popbill/env";

let configured = false;

function ensurePopbillConfigured() {
  if (configured) return;

  const env = getPopbillEnv();

  popbill.config({
    LinkID: env.linkId,
    SecretKey: env.secretKey,
    IsTest: env.isTest,
    defaultErrorHandler: (error: { code?: string | number; message?: string }) => {
      console.error(
        `[Popbill] ${error.code ?? "UNKNOWN"}: ${error.message ?? "Unknown error"}`,
      );
    },
  });

  configured = true;
}

export function getPopbillCorpNum() {
  return getPopbillEnv().corpNum;
}

export function getPopbillTaxinvoiceService() {
  ensurePopbillConfigured();
  return popbill.TaxinvoiceService();
}
