import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fitTextBoxRect } from '../core/fitTextBoxRect';
import type { TextBoxState } from '../types';
import { pdfRectToCss } from './textBoxStyles';

type Props = {
  state: TextBoxState;
  viewScale: number;
  canvas: HTMLCanvasElement | null;
  onChange: (state: TextBoxState) => void;
  onCommit: () => void;
  onCancel: () => void;
};

export default function TextBoxEditor({
  state,
  viewScale,
  canvas,
  onChange,
  onCommit,
  onCancel
}: Props) {
  const { t } = useTranslation('pdf');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const css = canvas ? pdfRectToCss(state.rect, canvas, viewScale) : null;
  const { style } = state;
  const showOriginalHint =
    state.originalText &&
    state.originalText.length > 0 &&
    state.text === state.originalText;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    const next = fitTextBoxRect({
      ...state,
      text,
      cursorIndex: cursor,
      selectionStart: e.target.selectionStart ?? cursor,
      selectionEnd: e.target.selectionEnd ?? cursor
    });
    onChange(next);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    onChange({
      ...state,
      cursorIndex: el.selectionStart ?? 0,
      selectionStart: el.selectionStart ?? 0,
      selectionEnd: el.selectionEnd ?? 0
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit();
    }
  };

  if (!css) return null;

  return (
    <>
      {showOriginalHint && (
        <span
          style={{
            position: 'absolute',
            left: css.left,
            top: Math.max(0, css.top - 18),
            fontSize: 11,
            color: '#666',
            zIndex: 4,
            pointerEvents: 'none'
          }}
        >
          {t('editor.originalPdfText')}
        </span>
      )}
      <textarea
        ref={ref}
        value={state.text}
        placeholder={t('editor.placeholder')}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onKeyDown={handleKeyDown}
        spellCheck
        style={{
          position: 'absolute',
          left: css.left,
          top: css.top,
          width: css.width,
          height: css.height,
          margin: 0,
          padding: '2px 4px',
          border: '2px solid #1976d2',
          borderRadius: 2,
          outline: 'none',
          resize: 'none',
          overflow: 'auto',
          boxSizing: 'border-box',
          background: 'rgba(255, 255, 255, 0.97)',
          color: style.fillColor,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize * css.fontScale,
          fontWeight: style.bold ? 700 : 400,
          fontStyle: style.italic ? 'italic' : 'normal',
          textAlign: style.alignment,
          lineHeight: 1.25,
          zIndex: 3
        }}
      />
    </>
  );
}
