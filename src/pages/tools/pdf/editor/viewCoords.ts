import type { Point, Rect } from './types';

/** Convert canvas pixel coordinates to PDF point space (top-left origin). */
export function canvasToPdf(point: Point, scale: number): Point {
  return { x: point.x / scale, y: point.y / scale };
}

export function pdfToCanvas(rect: Rect, scale: number): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale
  };
}

export function screenToCanvasPoint(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

export function screenToPdfPoint(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  viewScale: number
): Point {
  return canvasToPdf(screenToCanvasPoint(clientX, clientY, canvas), viewScale);
}
