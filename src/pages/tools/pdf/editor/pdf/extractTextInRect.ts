import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Rect } from '../types';

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

function itemBounds(item: TextItem, pageHeight: number): Rect {
  const scaleY = Math.hypot(item.transform[2], item.transform[3]);
  const fontSize =
    Math.hypot(item.transform[0], item.transform[1]) || scaleY || 12;
  const x = item.transform[4];
  const baseline = item.transform[5];
  const w = item.width || fontSize * Math.max(1, item.str.length) * 0.55;
  const h = item.height || fontSize * 1.2;
  const top = pageHeight - baseline - h * 0.2;
  return { x, y: top, width: w, height: h };
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Collects visible PDF text overlapping a box (top-left page coordinates). */
export async function extractTextInRect(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  rect: Rect,
  pageHeight: number
): Promise<string> {
  const page = await pdf.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const hits: { x: number; y: number; str: string }[] = [];

  for (const raw of content.items) {
    if (!('str' in raw) || typeof raw.str !== 'string' || !raw.str.trim()) {
      continue;
    }
    const item = raw as TextItem;
    if (!item.transform || item.transform.length < 6) continue;
    const bounds = itemBounds(item, pageHeight);
    if (!intersects(bounds, rect)) continue;
    hits.push({
      x: item.transform[4],
      y: item.transform[5],
      str: item.str
    });
  }

  hits.sort((a, b) => b.y - a.y || a.x - b.x);
  return hits
    .map((h) => h.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
