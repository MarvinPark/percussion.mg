import { toCanvas } from "html-to-image";
import { A4_CAPTURE_PIXEL_RATIO, fitCanvasToA4Portrait } from "@/lib/quote-document-a4";

const CAPTURE_OPTIONS = {
  pixelRatio: A4_CAPTURE_PIXEL_RATIO,
  backgroundColor: "#ffffff",
  cacheBust: true,
  skipFonts: true,
};

export async function captureTaxInvoicePreview(source: HTMLElement) {
  const canvas = await toCanvas(source, CAPTURE_OPTIONS);
  return fitCanvasToA4Portrait(canvas, A4_CAPTURE_PIXEL_RATIO);
}

export async function copyTaxInvoicePreviewToClipboard(source: HTMLElement) {
  const canvas = await captureTaxInvoicePreview(source);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png");
  });
  if (!blob) {
    throw new Error("이미지를 만들지 못했습니다.");
  }

  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("이 브라우저에서는 클립보드 복사를 지원하지 않습니다.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}

export async function downloadTaxInvoicePreviewPdf(
  source: HTMLElement,
  fileName: string,
) {
  const { jsPDF } = await import("jspdf");
  const canvas = await captureTaxInvoicePreview(source);
  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  pdf.addImage(imageData, "PNG", 0, 0, 210, 297);
  pdf.save(fileName);
}

export async function downloadTaxInvoicePreviewPng(
  source: HTMLElement,
  fileName: string,
) {
  const canvas = await captureTaxInvoicePreview(source);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
