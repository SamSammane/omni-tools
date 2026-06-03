import type { TextStyle } from './types';

export const DEFAULT_TEXT_BOX_WIDTH = 240;
export const DEFAULT_TEXT_BOX_HEIGHT = 48;

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontId: 'helvetica',
  fontFamily: 'Helvetica, Arial, sans-serif',
  fontSize: 14,
  bold: false,
  italic: false,
  fillColor: '#000000',
  alignment: 'left'
};

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 72;
