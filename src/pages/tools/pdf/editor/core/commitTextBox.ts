import type { PageTextBoxElement, TextBoxState } from '../types';

export function commitTextBox(state: TextBoxState): PageTextBoxElement | null {
  if (!state.text.trim()) return null;
  return {
    kind: 'textBox',
    pageId: state.pageId,
    rect: { ...state.rect },
    transform: { ...state.transform },
    text: state.text,
    originalText: state.originalText,
    style: { ...state.style }
  };
}
