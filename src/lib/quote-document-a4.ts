/** A4 portrait at 96 CSS dpi (matches browser mm units). */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const A4_CAPTURE_PIXEL_RATIO = 2;

export const A4_CAPTURE_WIDTH_PX = A4_WIDTH_PX * A4_CAPTURE_PIXEL_RATIO;
export const A4_CAPTURE_HEIGHT_PX = A4_HEIGHT_PX * A4_CAPTURE_PIXEL_RATIO;

export function fitCanvasToA4Portrait(
  source: HTMLCanvasElement,
  pixelRatio = A4_CAPTURE_PIXEL_RATIO,
): HTMLCanvasElement {
  const width = Math.round(A4_WIDTH_PX * pixelRatio);
  const height = Math.round(A4_HEIGHT_PX * pixelRatio);
  const target = document.createElement("canvas");
  target.width = width;
  target.height = height;

  const context = target.getContext("2d");
  if (!context) {
    throw new Error("canvas unavailable");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  const scale = Math.min(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  const offsetX = (width - drawWidth) / 2;

  context.drawImage(source, offsetX, 0, drawWidth, drawHeight);
  return target;
}
