import type { CursorDirection, TextBoxState, TextLayout } from '../types';

function setCursor(
  state: TextBoxState,
  index: number,
  extendSelection: boolean
): TextBoxState {
  const clamped = Math.max(0, Math.min(index, state.text.length));
  if (extendSelection) {
    return {
      ...state,
      cursorIndex: clamped,
      selectionEnd: clamped
    };
  }
  return {
    ...state,
    cursorIndex: clamped,
    selectionStart: clamped,
    selectionEnd: clamped
  };
}

export function moveCursor(
  state: TextBoxState,
  direction: CursorDirection,
  extendSelection: boolean,
  layout: TextLayout
): TextBoxState {
  const { cursorIndex, text } = state;

  switch (direction) {
    case 'left':
      return setCursor(state, cursorIndex - 1, extendSelection);
    case 'right':
      return setCursor(state, cursorIndex + 1, extendSelection);
    case 'home': {
      for (let i = 0; i < layout.lineCount; i++) {
        const range = layout.lineRange(i);
        if (cursorIndex >= range.start && cursorIndex <= range.end) {
          return setCursor(state, range.start, extendSelection);
        }
      }
      return setCursor(state, 0, extendSelection);
    }
    case 'end': {
      for (let i = 0; i < layout.lineCount; i++) {
        const range = layout.lineRange(i);
        if (cursorIndex >= range.start && cursorIndex <= range.end) {
          return setCursor(state, range.end, extendSelection);
        }
      }
      return setCursor(state, text.length, extendSelection);
    }
    case 'up':
    case 'down': {
      const caret = layout.cursorRect(cursorIndex);
      const targetY =
        direction === 'up'
          ? caret.y - state.style.fontSize * 0.5
          : caret.y + caret.height + state.style.fontSize * 0.5;
      const targetX = caret.x + 1;
      const nextIndex = layout.indexAtPoint({ x: targetX, y: targetY });
      return setCursor(state, nextIndex, extendSelection);
    }
    default:
      return state;
  }
}
