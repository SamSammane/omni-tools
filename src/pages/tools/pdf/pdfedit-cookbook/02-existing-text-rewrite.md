# Existing PDF Text Rewrite Algorithm

Editing text that already exists in a PDF is harder than adding a new text box.
Most PDFs do not store text as paragraphs. They often store positioned glyphs,
custom font encodings, text matrices, and fragmented drawing commands.

The reliable approach is to extract editable text objects, let the user edit a
controlled representation, then rebuild the page content stream.

## Key Principle

Do not patch bytes inside the original content stream.

Instead:

```text
parse original content stream
  -> build editable page elements
  -> user edits selected element
  -> serialize page elements into a new content stream
  -> replace page Contents and Resources
```

## Extraction

Parse each page content stream and intercept text sections:

```text
BT
  text state commands
  text positioning commands
  text showing commands
ET
```

Create one editable object for each text section or logical text group.

```text
EditableTextObject
  objectId
  pageId
  originalBounds
  originalTextPath
  graphicsStateBefore
  textState
  items[]
```

Each item should be one of:

```text
TextRun
  decodedText
  originalGlyphIds
  fontRef
  textMatrix
  fillColor

TextCommand
  operator
  operands

TextAdvance
  amount

GraphicsStateChange
  fillColor
  strokeColor
  opacity
  transform
```

## Editable Representation

Expose a controlled intermediate format rather than raw PDF syntax.

Example:

```xml
<font name="F1" size="12"/>
<matrix a="1" b="0" c="0" d="1" e="72" f="720"/>
Hello
<space advance="250"/>
world
```

The editor can later replace this XML-like representation with a visual editor,
but this intermediate format is useful for debugging and round-trip tests.

## User Edit Flow

```text
editExistingText(object):
  script = convertItemsToEditableScript(object.items)
  newScript = openEditorDialog(script)

  if user accepts:
    object.items = parseEditableScript(newScript)
    object.preview = regeneratePreview(object)
    mark page dirty
```

The preview should be regenerated from the same serializer path used by save.
That prevents the UI preview and saved PDF from diverging.

## Serialization

Convert the editable object back to PDF text commands:

```text
writeEditableTextObject(builder, object):
  builder.write("q")
  builder.applyGraphicsState(object.graphicsStateBefore)
  builder.write("BT")

  for item in object.items:
    if item is TextCommand:
      writeTextCommand(builder, item)

    if item is TextRun:
      encoded = encodeTextForFont(item.decodedText, item.fontRef)
      builder.writeHexString(encoded)
      builder.write("Tj")

    if item is TextAdvance:
      builder.writeAdvance(item.amount)

    if item is GraphicsStateChange:
      builder.write("ET")
      builder.applyGraphicsState(item)
      builder.write("BT")

  builder.write("ET")
  builder.write("Q")
```

## Operator Mapping

Support these PDF text operators first:

```text
BT    begin text object
ET    end text object
Tf    set font and size
Tm    set text matrix
Td    move text position
TD    move text position and set leading
T*    move to next line
Tj    show text
TJ    show text array with spacing adjustments
Tc    set character spacing
Tw    set word spacing
Tz    set horizontal scaling
TL    set leading
Tr    set text rendering mode
Ts    set text rise
```

Support graphics operators that commonly affect text:

```text
q     save graphics state
Q     restore graphics state
cm    concatenate matrix
rg    set fill RGB color
g     set fill gray color
k     set fill CMYK color
gs    set external graphics state
```

## Rebuild Page Content

When saving the page:

```text
saveEditedPage(page):
  builder = PdfContentBuilder(page.originalResources)

  for element in page.orderedElements:
    if element was not edited:
      builder.copyOriginalElement(element)

    if element is edited text:
      writeEditableTextObject(builder, element)

    if element is inserted text box:
      builder.writeTextBox(element)

    if element is inserted image or path:
      builder.writeElement(element)

  stream = compress(builder.bytes)
  page.Contents = stream
  page.Resources = builder.resources
```

## Limitations

Existing text replacement is not guaranteed to preserve the original PDF
byte-for-byte. The visual result depends on:

- original font encoding
- embedded fonts
- missing ToUnicode maps
- ligatures
- right-to-left scripts
- vertical writing
- text rendered as paths
- per-glyph positioning
- clipping masks
- transparency groups

For an MVP, detect unsupported cases and show a warning instead of silently
damaging the page.

