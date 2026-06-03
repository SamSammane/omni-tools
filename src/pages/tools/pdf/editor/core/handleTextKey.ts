import type {
  ClipboardAdapter,
  KeyboardEditEvent,
  TextBoxState
} from '../types';
import { layoutTextBox } from '../layout/canvasTextLayout';
import { moveCursor } from './moveCursor';
import {
  removeSelection,
  replaceSelection,
  selectedText
} from './replaceSelection';

const isMod = (e: KeyboardEditEvent) => e.ctrlKey || e.metaKey;

function needsLayout(event: KeyboardEditEvent): boolean {
  return (
    event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End'
  );
}

export function handleTextKey(
  state: TextBoxState,
  event: KeyboardEditEvent,
  clipboard: ClipboardAdapter
): TextBoxState {
  if (isMod(event) && event.key.toLowerCase() === 'a') {
    return {
      ...state,
      cursorIndex: state.text.length,
      selectionStart: 0,
      selectionEnd: state.text.length
    };
  }

  if (isMod(event) && event.key.toLowerCase() === 'c') {
    void clipboard.writeText(selectedText(state));
    return state;
  }

  if (isMod(event) && event.key.toLowerCase() === 'x') {
    const text = selectedText(state);
    void clipboard.writeText(text);
    return removeSelection(state);
  }

  if (
    (isMod(event) && event.key.toLowerCase() === 'v') ||
    event.type === 'paste'
  ) {
    return state;
  }

  if (event.key === 'Backspace') {
    if (state.selectionStart !== state.selectionEnd) {
      return removeSelection(state);
    }
    if (state.cursorIndex === 0) return state;
    const before = state.text.slice(0, state.cursorIndex - 1);
    const after = state.text.slice(state.cursorIndex);
    const cursorIndex = state.cursorIndex - 1;
    return {
      ...state,
      text: before + after,
      cursorIndex,
      selectionStart: cursorIndex,
      selectionEnd: cursorIndex
    };
  }

  if (event.key === 'Delete') {
    if (state.selectionStart !== state.selectionEnd) {
      return removeSelection(state);
    }
    if (state.cursorIndex >= state.text.length) return state;
    const before = state.text.slice(0, state.cursorIndex);
    const after = state.text.slice(state.cursorIndex + 1);
    return {
      ...state,
      text: before + after,
      selectionStart: state.cursorIndex,
      selectionEnd: state.cursorIndex
    };
  }

  if (needsLayout(event)) {
    const layout = layoutTextBox(state);
    if (event.key === 'ArrowLeft') {
      return moveCursor(state, 'left', event.shiftKey, layout);
    }
    if (event.key === 'ArrowRight') {
      return moveCursor(state, 'right', event.shiftKey, layout);
    }
    if (event.key === 'ArrowUp') {
      return moveCursor(state, 'up', event.shiftKey, layout);
    }
    if (event.key === 'ArrowDown') {
      return moveCursor(state, 'down', event.shiftKey, layout);
    }
    if (event.key === 'Home') {
      return moveCursor(state, 'home', event.shiftKey, layout);
    }
    if (event.key === 'End') {
      return moveCursor(state, 'end', event.shiftKey, layout);
    }
  }

  if (event.key === 'Enter') {
    if (state.multiline) {
      return replaceSelection(state, '\n');
    }
    return state;
  }

  if (event.text && event.text.length > 0 && !event.ctrlKey && !event.metaKey) {
    return replaceSelection(state, event.text);
  }

  return state;
}

export async function handlePaste(
  state: TextBoxState,
  clipboard: ClipboardAdapter
): Promise<TextBoxState> {
  const text = await clipboard.readText();
  if (!text) return state;
  return replaceSelection(state, text);
}
