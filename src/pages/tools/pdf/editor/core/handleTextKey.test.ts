import { describe, expect, it, vi } from 'vitest';
import { createTextBoxState } from './createTextBoxState';
import { handleTextKey } from './handleTextKey';
import { commitTextBox } from './commitTextBox';

const clipboard = {
  readText: async () => '',
  writeText: vi.fn()
};

describe('handleTextKey', () => {
  it('inserts printable text at cursor', () => {
    const state = createTextBoxState('page-1', {
      x: 0,
      y: 0,
      width: 200,
      height: 48
    });
    const next = handleTextKey(
      state,
      {
        key: 'a',
        code: 'KeyA',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        text: 'a',
        type: 'keydown'
      },
      clipboard
    );
    expect(next.text).toBe('a');
    expect(next.cursorIndex).toBe(1);
  });

  it('removes selection on backspace', () => {
    let state = createTextBoxState('page-1', {
      x: 0,
      y: 0,
      width: 200,
      height: 48
    });
    state = {
      ...state,
      text: 'hello',
      selectionStart: 1,
      selectionEnd: 4,
      cursorIndex: 4
    };
    const next = handleTextKey(
      state,
      {
        key: 'Backspace',
        code: 'Backspace',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        type: 'keydown'
      },
      clipboard
    );
    expect(next.text).toBe('ho');
  });
});

describe('commitTextBox', () => {
  it('returns null for empty text', () => {
    const state = createTextBoxState('page-1', {
      x: 0,
      y: 0,
      width: 200,
      height: 48
    });
    expect(commitTextBox(state)).toBeNull();
  });

  it('returns element for non-empty text', () => {
    const state = createTextBoxState('page-1', {
      x: 0,
      y: 0,
      width: 200,
      height: 48
    });
    const withText = { ...state, text: 'Hello' };
    const el = commitTextBox(withText);
    expect(el?.kind).toBe('textBox');
    expect(el?.text).toBe('Hello');
  });
});
