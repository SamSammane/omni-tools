import type { TextBoxState } from '../types';

export function replaceSelection(
  state: TextBoxState,
  insertedText: string
): TextBoxState {
  const start = Math.min(state.selectionStart, state.selectionEnd);
  const end = Math.max(state.selectionStart, state.selectionEnd);
  const before = state.text.slice(0, start);
  const after = state.text.slice(end);
  const text = before + insertedText + after;
  const cursorIndex = start + insertedText.length;
  return {
    ...state,
    text,
    cursorIndex,
    selectionStart: cursorIndex,
    selectionEnd: cursorIndex
  };
}

export function removeSelection(state: TextBoxState): TextBoxState {
  if (state.selectionStart === state.selectionEnd) return state;
  return replaceSelection(state, '');
}

export function getSelectionRange(state: TextBoxState): {
  start: number;
  end: number;
} {
  return {
    start: Math.min(state.selectionStart, state.selectionEnd),
    end: Math.max(state.selectionStart, state.selectionEnd)
  };
}

export function selectedText(state: TextBoxState): string {
  const { start, end } = getSelectionRange(state);
  return state.text.slice(start, end);
}
