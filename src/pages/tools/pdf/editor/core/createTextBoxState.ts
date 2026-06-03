import { DEFAULT_TEXT_STYLE } from '../constants';
import type { PageId, Rect, TextBoxState, TextStyle } from '../types';
import { identityMatrix } from '../types';
import { clampRectToPage } from './clampRect';

export function createTextBoxState(
  pageId: PageId,
  rect: Rect,
  style: TextStyle = DEFAULT_TEXT_STYLE,
  pageSize?: { width: number; height: number }
): TextBoxState {
  const clamped = pageSize
    ? clampRectToPage(rect, pageSize.width, pageSize.height)
    : rect;
  return {
    pageId,
    rect: clamped,
    transform: identityMatrix(),
    text: '',
    cursorIndex: 0,
    selectionStart: 0,
    selectionEnd: 0,
    multiline: true,
    style: { ...style }
  };
}
