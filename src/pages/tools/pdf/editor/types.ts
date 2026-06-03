export type PageId = string;

export type FontId = string;

export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; width: number; height: number };

export type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export const identityMatrix = (): Matrix => ({
  a: 1,
  b: 0,
  c: 0,
  d: 0,
  e: 0,
  f: 0
});

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export type TextStyle = {
  fontId: FontId;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  fillColor: string;
  alignment: TextAlignment;
};

export type TextBoxState = {
  pageId: PageId;
  rect: Rect;
  transform: Matrix;
  text: string;
  /** Text extracted from the PDF in this region when the box was created. */
  originalText?: string;
  cursorIndex: number;
  selectionStart: number;
  selectionEnd: number;
  multiline: boolean;
  style: TextStyle;
};

export type TextLayout = {
  lineCount: number;
  contentHeight: number;
  cursorRect: (index: number) => Rect;
  indexAtPoint: (point: Point) => number;
  lineRange: (lineIndex: number) => { start: number; end: number };
  selectionRects: (start: number, end: number) => Rect[];
};

export type PageTextBoxElement = {
  kind: 'textBox';
  pageId: PageId;
  rect: Rect;
  transform: Matrix;
  text: string;
  originalText?: string;
  style: TextStyle;
};

export type KeyboardEditEvent = {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  text?: string;
  type: 'keydown' | 'paste';
};

export type CursorDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'home'
  | 'end'
  | 'wordLeft'
  | 'wordRight';

export type ClipboardAdapter = {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
};

export type ViewportTransforms = {
  screenToPage: (point: Point) => Point;
  pageToScreen: (point: Point) => Point;
  pageSize: { width: number; height: number };
};

export type EditorTool = 'select' | 'text';

export type PageRenderInfo = {
  pageId: PageId;
  pageIndex: number;
  width: number;
  height: number;
  scale: number;
};
