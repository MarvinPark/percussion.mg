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

type SavedCellStyle = {
  element: HTMLTableCellElement;
  height: string;
  minHeight: string;
  verticalAlign: string;
  overflow: string;
  inner?: {
    element: HTMLElement;
    height: string;
    minHeight: string;
    boxSizing: string;
  };
};

function measureQuoteDocumentItemRowHeight(cells: HTMLTableCellElement[]) {
  const saved = cells.map((cell) => {
    const inner = cell.firstElementChild;
    return {
      cell,
      height: cell.style.height,
      minHeight: cell.style.minHeight,
      overflow: cell.style.overflow,
      inner: inner instanceof HTMLElement ? inner : null,
      innerHeight: inner instanceof HTMLElement ? inner.style.height : "",
      innerMinHeight: inner instanceof HTMLElement ? inner.style.minHeight : "",
      innerBoxSizing: inner instanceof HTMLElement ? inner.style.boxSizing : "",
    };
  });

  for (const item of saved) {
    item.cell.style.height = "auto";
    item.cell.style.minHeight = "auto";
    item.cell.style.overflow = "visible";
    if (item.inner) {
      item.inner.style.height = "auto";
      item.inner.style.minHeight = "auto";
      item.inner.style.boxSizing = "";
    }
  }

  let maxHeight = 0;
  for (const item of saved) {
    const description = item.cell.querySelector<HTMLElement>(
      "[data-quote-description]",
    );
    const innerHeight = item.inner?.scrollHeight ?? 0;
    const descriptionHeight = description ? description.scrollHeight + 14 : 0;
    maxHeight = Math.max(
      maxHeight,
      innerHeight,
      descriptionHeight,
      item.cell.scrollHeight,
      item.cell.getBoundingClientRect().height,
    );
  }

  for (const item of saved) {
    item.cell.style.height = item.height;
    item.cell.style.minHeight = item.minHeight;
    item.cell.style.overflow = item.overflow;
    if (item.inner) {
      item.inner.style.height = item.innerHeight;
      item.inner.style.minHeight = item.innerMinHeight;
      item.inner.style.boxSizing = item.innerBoxSizing;
    }
  }

  return Math.ceil(maxHeight + 10);
}

function applyQuoteDocumentItemRowHeight(
  cells: HTMLTableCellElement[],
  heightPx: number,
) {
  const heightValue = `${heightPx}px`;
  for (const cell of cells) {
    cell.style.height = heightValue;
    cell.style.minHeight = heightValue;
    cell.style.verticalAlign = "middle";
    cell.style.overflow = "visible";
    const inner = cell.firstElementChild;
    if (inner instanceof HTMLElement) {
      inner.style.height = "100%";
      inner.style.minHeight = heightValue;
      inner.style.boxSizing = "border-box";
    }
  }
}

export function applyQuoteDocumentTableRowHeights(root: HTMLElement) {
  const rows = root.querySelectorAll<HTMLTableRowElement>(
    "table.quote-document-table tbody tr[data-quote-item-row]",
  );

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td"));
    if (cells.length === 0) continue;

    const heightPx = measureQuoteDocumentItemRowHeight(cells);
    applyQuoteDocumentItemRowHeight(cells, heightPx);
  }
}

export function syncQuoteDocumentTableRowHeights(root: HTMLElement) {
  const saved: SavedCellStyle[] = [];
  const rows = root.querySelectorAll<HTMLTableRowElement>(
    "table.quote-document-table tbody tr[data-quote-item-row]",
  );

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>("td"));
    if (cells.length === 0) continue;

    for (const cell of cells) {
      const inner = cell.firstElementChild;
      const innerElement = inner instanceof HTMLElement ? inner : undefined;
      saved.push({
        element: cell,
        height: cell.style.height,
        minHeight: cell.style.minHeight,
        verticalAlign: cell.style.verticalAlign,
        overflow: cell.style.overflow,
        inner: innerElement
          ? {
              element: innerElement,
              height: innerElement.style.height,
              minHeight: innerElement.style.minHeight,
              boxSizing: innerElement.style.boxSizing,
            }
          : undefined,
      });
    }

    const heightPx = measureQuoteDocumentItemRowHeight(cells);
    applyQuoteDocumentItemRowHeight(cells, heightPx);
  }

  return () => {
    for (const item of saved) {
      item.element.style.height = item.height;
      item.element.style.minHeight = item.minHeight;
      item.element.style.verticalAlign = item.verticalAlign;
      item.element.style.overflow = item.overflow;
      if (item.inner) {
        item.inner.element.style.height = item.inner.height;
        item.inner.element.style.minHeight = item.inner.minHeight;
        item.inner.element.style.boxSizing = item.inner.boxSizing;
      }
    }
  };
}

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
  applyQuoteDocumentTableRowHeights(page);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  applyQuoteDocumentTableRowHeights(page);

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    const canvas = await toCanvas(page, CAPTURE_OPTIONS);
    return fitCanvasToA4Portrait(canvas, A4_CAPTURE_PIXEL_RATIO);
  } finally {
    restoreLayout();
    applyQuoteDocumentTableRowHeights(page);
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
