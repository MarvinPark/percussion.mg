import { toCanvas } from "html-to-image";
import { A4_CAPTURE_PIXEL_RATIO, fitCanvasToA4Portrait } from "@/lib/quote-document-a4";
import { TAX_INVOICE_PREVIEW_WIDTH_PX } from "@/lib/tax-invoice-preview-layout";

const CAPTURE_OPTIONS = {
  pixelRatio: A4_CAPTURE_PIXEL_RATIO,
  backgroundColor: "#ffffff",
  cacheBust: true,
  skipFonts: true,
};

type SavedStyle = {
  element: HTMLElement;
  overflow: string;
  maxHeight: string;
  height: string;
  maxWidth: string;
  width: string;
};

function unlockCaptureLayout(source: HTMLElement) {
  const saved: SavedStyle[] = [];
  let current: HTMLElement | null = source;

  while (current) {
    saved.push({
      element: current,
      overflow: current.style.overflow,
      maxHeight: current.style.maxHeight,
      height: current.style.height,
      maxWidth: current.style.maxWidth,
      width: current.style.width,
    });
    current.style.overflow = "visible";
    current.style.maxHeight = "none";
    current.style.height = "auto";
    current.style.maxWidth = "none";
    current.style.width = "auto";
    current = current.parentElement;
  }

  return () => {
    for (const item of saved) {
      item.element.style.overflow = item.overflow;
      item.element.style.maxHeight = item.maxHeight;
      item.element.style.height = item.height;
      item.element.style.maxWidth = item.maxWidth;
      item.element.style.width = item.width;
    }
  };
}

async function captureTaxInvoicePreviewFull(source: HTMLElement) {
  const restoreLayout = unlockCaptureLayout(source);
  const savedSourceMaxWidth = source.style.maxWidth;
  const savedSourceMinWidth = source.style.minWidth;
  const savedSourceWidth = source.style.width;

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    source.style.maxWidth = "none";
    source.style.minWidth = `${TAX_INVOICE_PREVIEW_WIDTH_PX}px`;
    source.style.width = `${TAX_INVOICE_PREVIEW_WIDTH_PX}px`;

    const captureHeight = Math.max(source.scrollHeight, source.clientHeight);

    return await toCanvas(source, {
      ...CAPTURE_OPTIONS,
      width: TAX_INVOICE_PREVIEW_WIDTH_PX,
      height: captureHeight,
    });
  } finally {
    source.style.maxWidth = savedSourceMaxWidth;
    source.style.minWidth = savedSourceMinWidth;
    source.style.width = savedSourceWidth;
    restoreLayout();
  }
}

export async function captureTaxInvoicePreview(source: HTMLElement) {
  const canvas = await captureTaxInvoicePreviewFull(source);
  return fitCanvasToA4Portrait(canvas, A4_CAPTURE_PIXEL_RATIO);
}

export async function copyTaxInvoicePreviewToClipboard(source: HTMLElement) {
  const canvas = await captureTaxInvoicePreviewFull(source);
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
  const canvas = await captureTaxInvoicePreviewFull(source);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
