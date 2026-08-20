import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/document-titles";

export const metadata = createPageMetadata("결제수단");

export default function PaymentMethodsPage() {
  redirect("/settings/users#payment-methods");
}
