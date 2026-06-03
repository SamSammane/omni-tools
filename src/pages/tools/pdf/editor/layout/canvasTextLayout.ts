import type { Point, Rect, TextBoxState, TextLayout } from '../types';

type LineInfo = {
  start: number;
  end: number;
  text: string;
  width: number;
  y: number;
  height: number;
};

function measureContext(
  style: TextBoxState['style']
): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const weight = style.bold ? 'bold' : 'normal';
  const fontStyle = style.italic ? 'italic' : 'normal';
  ctx.font = `${fontStyle} ${weight} ${style.fontSize}px ${style.fontFamily}`;
  return ctx;
}

function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  ctx: CanvasRenderingContext2D
): string[] {
  if (!paragraph) return [''];
  const words = paragraph.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current + word;
    if (ctx.measureText(candidate).width <= maxWidth || current === '') {
      current = candidate;
    } else {
      lines.push(current);
      current = word.trimStart() === word ? word : word;
      if (ctx.measureText(current).width > maxWidth) {
        for (const ch of word) {
          const next = current + ch;
          if (ctx.measureText(next).width > maxWidth && current) {
            lines.push(current);
            current = ch;
          } else {
            current = next;
          }
        }
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function buildLines(state: TextBoxState): LineInfo[] {
  const ctx = measureContext(state.style);
  const lineHeight = state.style.fontSize * 1.25;
  const paragraphs = state.text.split('\n');
  const lines: LineInfo[] = [];
  let index = 0;
  let y = 0;

  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];
    const wrapped = wrapParagraph(paragraph, state.rect.width, ctx);
    for (const lineText of wrapped) {
      const end = index + lineText.length;
      lines.push({
        start: index,
        end,
        text: lineText,
        width: ctx.measureText(lineText).width,
        y,
        height: lineHeight
      });
      index = end;
      y += lineHeight;
    }
    if (paragraph.length === 0) {
      lines.push({
        start: index,
        end: index,
        text: '',
        width: 0,
        y,
        height: lineHeight
      });
      y += lineHeight;
    }
    if (p < paragraphs.length - 1) index += 1;
  }

  if (lines.length === 0) {
    lines.push({
      start: 0,
      end: 0,
      text: '',
      width: 0,
      y: 0,
      height: lineHeight
    });
  }

  return lines;
}

function alignOffset(
  lineWidth: number,
  boxWidth: number,
  alignment: TextBoxState['style']['alignment']
): number {
  switch (alignment) {
    case 'center':
      return Math.max(0, (boxWidth - lineWidth) / 2);
    case 'right':
      return Math.max(0, boxWidth - lineWidth);
    default:
      return 0;
  }
}

export function textBoxStateFromElement(
  element: import('../types').PageTextBoxElement
): TextBoxState {
  return {
    pageId: element.pageId,
    rect: element.rect,
    transform: element.transform,
    text: element.text,
    originalText: element.originalText,
    cursorIndex: 0,
    selectionStart: 0,
    selectionEnd: 0,
    multiline: true,
    style: element.style
  };
}

export function getWrappedLineTexts(
  element: import('../types').PageTextBoxElement
): string[] {
  return buildLines(textBoxStateFromElement(element)).map((l) => l.text);
}

export function layoutTextBox(state: TextBoxState): TextLayout {
  const lines = buildLines(state);
  const contentHeight = lines.reduce((h, l) => h + l.height, 0);

  const indexAtPoint = (point: Point): number => {
    const line =
      lines.find((l) => point.y >= l.y && point.y < l.y + l.height) ??
      (point.y < 0 ? lines[0] : lines[lines.length - 1]);
    const ctx = measureContext(state.style);
    const offset = alignOffset(
      line.width,
      state.rect.width,
      state.style.alignment
    );
    const localX = Math.max(0, point.x - offset);
    let best = line.start;
    let bestDist = Infinity;
    for (let i = 0; i <= line.text.length; i++) {
      const w = ctx.measureText(line.text.slice(0, i)).width;
      const dist = Math.abs(w - localX);
      if (dist <= bestDist) {
        bestDist = dist;
        best = line.start + i;
      }
    }
    return Math.max(line.start, Math.min(best, line.end));
  };

  const cursorRect = (index: number): Rect => {
    const line =
      lines.find((l) => index >= l.start && index <= l.end) ??
      lines[lines.length - 1];
    const ctx = measureContext(state.style);
    const offset = alignOffset(
      line.width,
      state.rect.width,
      state.style.alignment
    );
    const localIndex = Math.max(
      0,
      Math.min(index - line.start, line.text.length)
    );
    const x = offset + ctx.measureText(line.text.slice(0, localIndex)).width;
    return { x, y: line.y, width: 1, height: line.height };
  };

  const selectionRects = (start: number, end: number): Rect[] => {
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const rects: Rect[] = [];
    for (const line of lines) {
      if (e <= line.start || s >= line.end) continue;
      const lineStart = Math.max(s, line.start);
      const lineEnd = Math.min(e, line.end);
      const ctx = measureContext(state.style);
      const offset = alignOffset(
        line.width,
        state.rect.width,
        state.style.alignment
      );
      const x1 =
        offset +
        ctx.measureText(line.text.slice(0, lineStart - line.start)).width;
      const x2 =
        offset +
        ctx.measureText(line.text.slice(0, lineEnd - line.start)).width;
      rects.push({
        x: x1,
        y: line.y,
        width: Math.max(1, x2 - x1),
        height: line.height
      });
    }
    return rects;
  };

  return {
    lineCount: lines.length,
    contentHeight,
    cursorRect,
    indexAtPoint,
    lineRange: (lineIndex: number) => {
      const line = lines[lineIndex] ?? lines[0];
      return { start: line.start, end: line.end };
    },
    selectionRects
  };
}

export function drawInlineTextEditor(
  ctx: CanvasRenderingContext2D,
  state: TextBoxState,
  layout: TextLayout,
  focused: boolean
): void {
  const { rect, style } = state;
  ctx.save();
  ctx.translate(rect.x, rect.y);

  if (focused) {
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      0,
      0,
      rect.width,
      Math.max(rect.height, layout.contentHeight)
    );
  }

  const { start, end } = {
    start: Math.min(state.selectionStart, state.selectionEnd),
    end: Math.max(state.selectionStart, state.selectionEnd)
  };

  for (const selRect of layout.selectionRects(start, end)) {
    ctx.fillStyle = 'rgba(25, 118, 210, 0.25)';
    ctx.fillRect(selRect.x, selRect.y, selRect.width, selRect.height);
  }

  const measure = measureContext(style);
  ctx.font = measure.font;
  ctx.fillStyle = style.fillColor;
  ctx.textBaseline = 'top';

  const lines = buildLines(state);
  for (const line of lines) {
    const offset = alignOffset(line.width, rect.width, style.alignment);
    ctx.fillText(line.text, offset, line.y);
  }

  if (focused && start === end) {
    const caret = layout.cursorRect(state.cursorIndex);
    ctx.fillStyle = style.fillColor;
    ctx.fillRect(caret.x, caret.y, 2, caret.height);
  }

  ctx.restore();
}

export function drawCommittedTextBox(
  ctx: CanvasRenderingContext2D,
  element: import('../types').PageTextBoxElement,
  selected: boolean
): void {
  const layout = layoutTextBox({
    pageId: element.pageId,
    rect: element.rect,
    transform: element.transform,
    text: element.text,
    cursorIndex: 0,
    selectionStart: 0,
    selectionEnd: 0,
    multiline: true,
    style: element.style
  });

  if (selected) {
    ctx.save();
    ctx.translate(element.rect.x, element.rect.y);
    ctx.strokeStyle = '#ed6c02';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      0,
      0,
      element.rect.width,
      Math.max(element.rect.height, layout.contentHeight)
    );
    ctx.restore();
  }

  drawInlineTextEditor(
    ctx,
    {
      pageId: element.pageId,
      rect: element.rect,
      transform: element.transform,
      text: element.text,
      cursorIndex: 0,
      selectionStart: 0,
      selectionEnd: 0,
      multiline: true,
      style: element.style
    },
    layout,
    false
  );
}
