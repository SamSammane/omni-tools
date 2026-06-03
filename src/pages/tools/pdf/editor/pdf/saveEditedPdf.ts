import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  layoutTextBox,
  textBoxStateFromElement
} from '../layout/canvasTextLayout';
import { PageScene } from '../scene/PageScene';
import { hexToPdfRgb } from './parseColor';
import type { PageTextBoxElement } from '../types';

function pageIndexFromId(pageId: string): number {
  const match = pageId.match(/^page-(\d+)$/);
  return match ? parseInt(match[1], 10) - 1 : 0;
}

function measureLineWidth(text: string, element: PageTextBoxElement): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const { style } = element;
  const weight = style.bold ? 'bold' : 'normal';
  const fontStyle = style.italic ? 'italic' : 'normal';
  ctx.font = `${fontStyle} ${weight} ${style.fontSize}px ${style.fontFamily}`;
  return ctx.measureText(text).width;
}

function writeTextBoxToPage(
  element: PageTextBoxElement,
  page: ReturnType<PDFDocument['getPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
): void {
  const { height } = page.getSize();
  const state = textBoxStateFromElement(element);
  const layout = layoutTextBox(state);
  const lineHeight = element.style.fontSize * 1.25;
  let yBaseline = height - element.rect.y - element.style.fontSize;

  for (let i = 0; i < layout.lineCount; i++) {
    const range = layout.lineRange(i);
    const line = element.text.slice(range.start, range.end);
    const lineWidth = measureLineWidth(line, element);
    let x = element.rect.x;
    if (element.style.alignment === 'center') {
      x = element.rect.x + (element.rect.width - lineWidth) / 2;
    } else if (element.style.alignment === 'right') {
      x = element.rect.x + element.rect.width - lineWidth;
    }
    if (line) {
      page.drawText(line, {
        x,
        y: yBaseline,
        size: element.style.fontSize,
        font,
        color: hexToPdfRgb(element.style.fillColor),
        maxWidth: element.rect.width
      });
    }
    yBaseline -= lineHeight;
  }
}

export async function saveEditedPdf(
  sourceFile: File,
  scene: PageScene
): Promise<File> {
  const bytes = await sourceFile.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const element of scene.allElements()) {
    const page = pdf.getPage(pageIndexFromId(element.pageId));
    writeTextBoxToPage(element, page, font);
  }

  const out = await pdf.save();
  return new File(
    [out as BlobPart],
    sourceFile.name.replace(/\.pdf$/i, '-edited.pdf'),
    { type: 'application/pdf' }
  );
}
