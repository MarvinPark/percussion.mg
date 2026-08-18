import { redirect } from "next/navigation";

export default function PaymentMethodsPage() {
  redirect("/settings/users#payment-methods");
}
