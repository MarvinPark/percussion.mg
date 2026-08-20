import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import AppBrandFooter from "@/components/app-brand-footer";
import BottomFloatingActions from "@/components/bottom-floating-actions";
import DocumentTitle from "@/components/document-title";
import { rootDocumentMetadata } from "@/lib/document-titles";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "600", "900"],
  display: "swap",
});

export const metadata: Metadata = rootDocumentMetadata;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
  (function () {
    var theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <DocumentTitle />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <AppBrandFooter />
        <BottomFloatingActions />
      </body>
    </html>
  );
}
