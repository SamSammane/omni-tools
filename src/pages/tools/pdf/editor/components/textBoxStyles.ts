import type { Rect } from '../types';

export function pdfRectToCss(
  rect: Rect,
  canvas: HTMLCanvasElement,
  viewScale: number
): {
  left: number;
  top: number;
  width: number;
  height: number;
  fontScale: number;
} {
  const cssScale = canvas.getBoundingClientRect().width / canvas.width;
  const px = viewScale * cssScale;
  return {
    left: rect.x * px,
    top: rect.y * px,
    width: rect.width * px,
    height: rect.height * px,
    fontScale: px
  };
}
