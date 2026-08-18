"use client";

import { useEffect, useState } from "react";
import { listPaymentMethods } from "@/app/(main)/sales/payment-methods/actions";
import { sortPaymentMethods } from "@/lib/payment-methods";
import type { PaymentMethod } from "@/types/sale";

export function useLivePaymentMethods(initial: PaymentMethod[]) {
  const [methods, setMethods] = useState(() => sortPaymentMethods(initial));

  useEffect(() => {
    setMethods(sortPaymentMethods(initial));
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    void listPaymentMethods().then((result) => {
      if (cancelled || result.error) return;
      setMethods(sortPaymentMethods(result.paymentMethods));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return methods;
}
