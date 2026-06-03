import { layoutTextBox } from '../layout/canvasTextLayout';
import type { Rect, TextBoxState } from '../types';

const MIN_BOX_HEIGHT = 24;
const PADDING = 4;

export function fitTextBoxRect(state: TextBoxState): TextBoxState {
  const layout = layoutTextBox(state);
  const contentHeight = layout.contentHeight + PADDING;
  return {
    ...state,
    rect: {
      ...state.rect,
      height: Math.max(MIN_BOX_HEIGHT, contentHeight, state.rect.height)
    }
  };
}

export function hitCommittedBox(
  pagePoint: { x: number; y: number },
  elements: import('../types').PageTextBoxElement[]
): number | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    const layout = layoutTextBox({
      pageId: el.pageId,
      rect: el.rect,
      transform: el.transform,
      text: el.text,
      cursorIndex: 0,
      selectionStart: 0,
      selectionEnd: 0,
      multiline: true,
      style: el.style
    });
    const h = Math.max(el.rect.height, layout.contentHeight);
    if (
      pagePoint.x >= el.rect.x &&
      pagePoint.x <= el.rect.x + el.rect.width &&
      pagePoint.y >= el.rect.y &&
      pagePoint.y <= el.rect.y + h
    ) {
      return i;
    }
  }
  return null;
}

export function moveRect(
  rect: Rect,
  dx: number,
  dy: number,
  pageSize: Rect
): Rect {
  return {
    ...rect,
    x: Math.max(0, Math.min(rect.x + dx, pageSize.width - rect.width)),
    y: Math.max(0, Math.min(rect.y + dy, pageSize.height - rect.height))
  };
}
