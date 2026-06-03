import type { Rect } from '../types';

export function clampRectToPage(
  rect: Rect,
  pageWidth: number,
  pageHeight: number
): Rect {
  const width = Math.min(rect.width, pageWidth);
  const height = Math.min(rect.height, pageHeight);
  const x = Math.max(0, Math.min(rect.x, pageWidth - width));
  const y = Math.max(0, Math.min(rect.y, pageHeight - height));
  return { x, y, width, height };
}
