import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/document-titles";

export const metadata = createPageMetadata("회원가입");

export default function SignupPage() {
  redirect("/login?register=1");
}
