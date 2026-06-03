import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type RenderedPage = {
  width: number;
  height: number;
  scale: number;
};

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const data = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data }).promise;
}

export async function renderPdfPageToCanvas(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<RenderedPage> {
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return {
    width: viewport.width / scale,
    height: viewport.height / scale,
    scale
  };
}
