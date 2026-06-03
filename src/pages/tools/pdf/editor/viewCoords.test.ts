import { describe, expect, it } from 'vitest';
import { canvasToPdf, pdfToCanvas } from './viewCoords';

describe('viewCoords', () => {
  it('converts between canvas pixels and PDF points', () => {
    expect(canvasToPdf({ x: 125, y: 250 }, 1.25)).toEqual({ x: 100, y: 200 });
    expect(
      pdfToCanvas({ x: 100, y: 200, width: 240, height: 48 }, 1.25)
    ).toEqual({
      x: 125,
      y: 250,
      width: 300,
      height: 60
    });
  });
});
