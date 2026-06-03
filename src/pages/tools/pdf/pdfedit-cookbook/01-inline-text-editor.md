# Inline Text Editor Algorithm

This document describes the algorithm for adding and editing a new inline text box
on top of a PDF page.

The goal is to make typing feel like a normal document editor while keeping the
PDF writer separate.

## Data Model

Keep one editable state object while the user is typing:

```text
TextBoxState
  pageId
  rectInPageSpace
  rotation
  text
  cursorIndex
  selectionStart
  selectionEnd
  fontFamily
  fontSize
  bold
  italic
  textColor
  alignment
  multiline
  wrapping
  isComposingImeText
```

Keep indices in Unicode code points or grapheme clusters. Avoid raw byte offsets.
For a first MVP, UTF-16 indices may be acceptable if the UI framework uses them,
but this will need more care for emoji, combining marks, and complex scripts.

## Coordinate Spaces

Use explicit transforms:

```text
screen point
  -> viewport point
  -> page point
  -> text box local point
```

The text box local coordinate system is where layout happens. Mouse hit testing
should never directly use screen coordinates.

## Activation

1. User selects the text tool.
2. User drags or clicks on the page to define a text rectangle.
3. Create `TextBoxState`.
4. Give keyboard focus to the inline editor.
5. Draw the caret and editable border.

If the user only clicks, create a default rectangle such as:

```text
width = 240 page units
height = 48 page units
```

Clamp the rectangle so it remains inside the page crop box.

## Keyboard Editing

The keyboard handler should be framework-independent:

```text
handleKey(state, event):
  if event is copy:
    copy selected text
    return state

  if event is cut:
    copy selected text
    remove selection
    relayout
    return state

  if event is paste:
    replace selection with clipboard text
    relayout
    return state

  if event is printable text:
    replace selection with event.text
    move cursor after inserted text
    relayout
    return state

  if event is Backspace:
    if selection exists:
      remove selection
    else:
      remove grapheme before cursor
    relayout
    return state

  if event is Delete:
    if selection exists:
      remove selection
    else:
      remove grapheme after cursor
    relayout
    return state

  if event is ArrowLeft or ArrowRight:
    move cursor horizontally
    update selection if Shift is down
    return state

  if event is ArrowUp or ArrowDown:
    use layout engine to move to nearest cursor on previous or next line
    update selection if Shift is down
    return state

  if event is Home or End:
    move to line start or line end
    update selection if Shift is down
    return state

  if event is Enter:
    if multiline:
      insert line break
      relayout
    else:
      commit editing
```

Use a layout engine for vertical cursor movement. Do not estimate line positions
from font size alone.

## Text Layout

Relayout after any state change that affects text, box size, font, alignment, or
wrapping.

```text
relayout(state):
  layout = TextLayoutEngine.create(state.text, state.font)
  layout.setWidth(state.rect.width)
  layout.setAlignment(state.alignment)
  layout.setWrapMode(state.wrapping)

  y = 0
  while layout has more text:
    line = layout.createLine()
    line.setPosition(0, y)
    line.setWidth(state.rect.width)
    y += line.height

  state.layout = layout
  state.contentHeight = y
```

The layout result must support:

- cursor index to x/y caret rectangle
- x/y point to cursor index
- selected ranges per visual line
- text drawing
- cursor drawing

## Mouse Hit Testing

```text
hitTest(state, screenPoint):
  pagePoint = viewportToPage(screenPoint)
  localPoint = inverse(textBoxTransform).map(pagePoint)

  line = layout.lineAtY(localPoint.y)
  if no line:
    return nearest start or end index

  return line.xToCursor(localPoint.x)
```

Single click:

```text
cursorIndex = hitTest(...)
selectionStart = cursorIndex
selectionEnd = cursorIndex
```

Drag:

```text
selectionEnd = hitTest(...)
cursorIndex = selectionEnd
```

Double click:

```text
wordRange = findWordBoundary(text, hitIndex)
selectionStart = wordRange.start
selectionEnd = wordRange.end
cursorIndex = wordRange.end
```

## Drawing

Draw in this order:

1. Optional text-box border while editing.
2. Selection highlights.
3. Text.
4. Caret if the editor has focus.

```text
drawInlineEditor(painter, state):
  painter.save()
  painter.apply(pageToViewportTransform)
  painter.apply(textBoxTransform)

  if editing:
    painter.drawRect(localRect)

  layout.drawSelection(selectionStart, selectionEnd)
  layout.drawText(0, 0)

  if focused and selection is empty:
    layout.drawCursor(cursorIndex)

  painter.restore()
```

## Commit

When editing finishes:

```text
commitInlineText(state):
  if state.text is empty:
    discard element
  else:
    create PageTextBoxElement from state
    add it to page scene
    mark page dirty
```

Do not write to the PDF file at this point. Save only when the user requests a
document save or export.

## Save New Text Box To PDF

On save:

```text
savePage(page):
  builder = PdfContentBuilder(page.originalResources)

  for element in page.elements:
    if element is original page content:
      builder.copyOrRewriteOriginal(element)

    if element is new text box:
      builder.writeTextBox(element)

  page.contents = compress(builder.contentStream)
  page.resources = builder.resources
```

For a simple implementation, `writeTextBox` can emit PDF text operators:

```text
q
BT
/F1 12 Tf
1 0 0 1 x y Tm
(Hello) Tj
ET
Q
```

For high fidelity, the writer must handle:

- font embedding or font reuse
- character encoding
- line wrapping
- text matrix
- page rotation
- fill color
- clipping to the text box
- multiline text positioning

