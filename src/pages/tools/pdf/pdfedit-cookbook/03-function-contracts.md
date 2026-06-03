# Function Contracts

This file gives language-neutral interfaces for the PDF inline editing system.
The types are written in TypeScript style only because it is compact and readable.

## Core Types

```ts
type PageId = string;
type FontId = string;

type Point = {
  x: number;
  y: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

type TextAlignment = "left" | "center" | "right" | "justify";

type TextStyle = {
  fontId: FontId;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  fillColor: string;
  alignment: TextAlignment;
};

type TextBoxState = {
  pageId: PageId;
  rect: Rect;
  transform: Matrix;
  text: string;
  cursorIndex: number;
  selectionStart: number;
  selectionEnd: number;
  multiline: boolean;
  style: TextStyle;
};
```

## Live Text Editing

```ts
function createTextBoxState(
  pageId: PageId,
  rect: Rect,
  style: TextStyle
): TextBoxState;
```

Creates a new empty inline text box.

```ts
function handleTextKey(
  state: TextBoxState,
  event: KeyboardEditEvent,
  clipboard: ClipboardAdapter
): TextBoxState;
```

Handles typing, delete, backspace, copy, paste, cut, cursor movement, selection,
and Enter behavior.

```ts
function replaceSelection(
  state: TextBoxState,
  insertedText: string
): TextBoxState;
```

Deletes the selected range and inserts new text at the selection start.

```ts
function moveCursor(
  state: TextBoxState,
  direction: CursorDirection,
  extendSelection: boolean,
  layout: TextLayout
): TextBoxState;
```

Moves the cursor. Vertical movement should use `TextLayout`, not simple math.

```ts
function hitTestTextBox(
  state: TextBoxState,
  screenPoint: Point,
  transforms: ViewportTransforms,
  layout: TextLayout
): number;
```

Maps a screen point to a text index.

```ts
function drawInlineTextEditor(
  painter: Painter,
  state: TextBoxState,
  layout: TextLayout,
  focused: boolean
): void;
```

Draws border, selection, text, and caret.

```ts
function commitTextBox(state: TextBoxState): PageTextBoxElement | null;
```

Returns `null` when the text is empty. Otherwise returns a committed page element.

## Layout Adapter

Use the platform text engine behind this adapter. Examples include Qt
`QTextLayout`, DirectWrite, Core Text, HarfBuzz plus a layout wrapper, or a browser
layout engine.

```ts
type TextLayout = {
  lineCount: number;
  contentHeight: number;

  cursorRect(index: number): Rect;
  indexAtPoint(point: Point): number;
  lineRange(lineIndex: number): { start: number; end: number };
  selectionRects(start: number, end: number): Rect[];
};

function layoutTextBox(state: TextBoxState): TextLayout;
```

## PDF Page Elements

```ts
type PageTextBoxElement = {
  kind: "textBox";
  pageId: PageId;
  rect: Rect;
  transform: Matrix;
  text: string;
  style: TextStyle;
};

type EditableTextObject = {
  kind: "existingText";
  pageId: PageId;
  bounds: Rect;
  textPathBounds: Rect;
  baseGraphicsState: PdfGraphicsState;
  items: EditableTextItem[];
};

type PageElement =
  | PageTextBoxElement
  | EditableTextObject
  | ImageElement
  | PathElement;
```

## Existing Text Extraction

```ts
function extractEditablePageElements(
  page: PdfPage,
  parser: PdfContentParser
): PageElement[];
```

Parses the page content stream and returns ordered editable page elements.

```ts
function convertTextItemsToScript(
  items: EditableTextItem[]
): string;
```

Converts internal text items to a controlled XML-like or JSON-like script.

```ts
function parseEditableTextScript(
  script: string
): EditableTextItem[];
```

Parses user-edited script back into editable text items. This function must
validate input and report precise errors.

## PDF Serialization

```ts
function saveEditedPage(
  page: PdfPage,
  elements: PageElement[],
  builder: PdfContentBuilder
): PdfPageUpdate;
```

Writes all page elements to a new content stream and returns updated `Contents`
and `Resources`.

```ts
function writeTextBox(
  builder: PdfContentBuilder,
  element: PageTextBoxElement
): void;
```

Writes a new inline text box as PDF text operators or painter-generated paths.

```ts
function writeEditableTextObject(
  builder: PdfContentBuilder,
  object: EditableTextObject
): void;
```

Writes an edited existing text object.

```ts
function encodeTextForFont(
  text: string,
  font: PdfFont
): Uint8Array;
```

Converts Unicode text into bytes valid for the selected PDF font.

This is one of the most important failure points. If the font cannot encode the
text, either embed a fallback font or reject the edit with a clear error.

## Minimum Test Cases

```text
insert single line text
insert multiline text
backspace at start
delete at end
replace selected text
select by dragging
double-click word selection
arrow left/right
arrow up/down across wrapped lines
copy/cut/paste
save page with one inserted text box
save page with edited existing text object
font cannot encode character
PDF round trip preserves page count and opens in common viewers
```

