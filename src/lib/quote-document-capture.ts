import { toCanvas } from "html-to-image";
import {
  A4_CAPTURE_PIXEL_RATIO,
  fitCanvasToA4Portrait,
} from "@/lib/quote-document-a4";

const CAPTURE_OPTIONS = {
  pixelRatio: A4_CAPTURE_PIXEL_RATIO,
  backgroundColor: "#ffffff",
  cacheBust: true,
  skipFonts: true,
};

const MAX_CANVAS_HEIGHT = 16000;

type SavedStyle = {
  element: HTMLElement;
  overflow: string;
  maxHeight: string;
  height: string;
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
    });
    current.style.overflow = "visible";
    current.style.maxHeight = "none";
    current.style.height = "auto";
    current = current.parentElement;
  }

  return () => {
    for (const item of saved) {
      item.element.style.overflow = item.overflow;
      item.element.style.maxHeight = item.maxHeight;
      item.element.style.height = item.height;
    }
  };
}

async function renderPageCanvas(page: HTMLElement) {
  const restoreLayout = unlockCaptureLayout(page);

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    const canvas = await toCanvas(page, CAPTURE_OPTIONS);
    return fitCanvasToA4Portrait(canvas, A4_CAPTURE_PIXEL_RATIO);
  } finally {
    restoreLayout();
  }
}

function mergeCanvases(canvases: HTMLCanvasElement[]) {
  if (canvases.length === 0) {
    throw new Error("capture pages missing");
  }

  if (canvases.length === 1) {
    return canvases[0];
  }

  const width = canvases[0].width;
  const height = canvases.reduce((sum, canvas) => sum + canvas.height, 0);

  if (height > MAX_CANVAS_HEIGHT) {
    throw new Error("capture too large");
  }

  const merged = document.createElement("canvas");
  merged.width = width;
  merged.height = height;

  const context = merged.getContext("2d");
  if (!context) {
    throw new Error("canvas unavailable");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  let offsetY = 0;
  for (const canvas of canvases) {
    context.drawImage(canvas, 0, offsetY);
    offsetY += canvas.height;
  }

  return merged;
}

export async function captureQuoteDocumentPages(source: HTMLElement) {
  const pages = source.querySelectorAll<HTMLElement>(".print-page");
  if (pages.length === 0) {
    throw new Error("capture pages missing");
  }

  const canvases: HTMLCanvasElement[] = [];
  for (const page of pages) {
    canvases.push(await renderPageCanvas(page));
  }

  return canvases;
}

export async function captureQuoteDocumentFull(source: HTMLElement) {
  const pageCanvases = await captureQuoteDocumentPages(source);
  return mergeCanvases(pageCanvases);
}
