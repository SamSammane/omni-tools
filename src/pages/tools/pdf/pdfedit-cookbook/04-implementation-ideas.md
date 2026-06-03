# Implementation Ideas

This file collects practical ideas for turning the algorithm into a PDF program.

## MVP

Build the first version around inserted text boxes only:

1. Text tool.
2. Click or drag to create a text box.
3. Type text inline.
4. Move cursor with mouse and keyboard.
5. Select and replace text.
6. Change font size, color, and alignment.
7. Save inserted text into the PDF.

This creates a useful editor without needing to solve hard existing-text rewrite
cases immediately.

## UX Ideas

- Show a thin editable border only while the text box is active.
- Use resize handles on committed text boxes.
- Support Esc to cancel and Ctrl+Enter to commit.
- Show a small floating toolbar near the selected text box.
- Keep text style sticky so the next text box reuses the last style.
- Add snapping to page margins and nearby objects.
- Add a warning when text overflows its box.
- Add a "fit box to text" command.

## Existing Text Ideas

Existing PDF text should be treated as an advanced mode:

- Start with "replace selected text object" rather than paragraph editing.
- Show the original extracted text and the editable script side by side.
- Add a preview before committing the change.
- Warn when the original text uses unsupported encoding or glyph-only text.
- Fall back to covering old text and inserting a new text box when true rewrite is
  unsafe.

## Safer Replacement Strategy

For many real-world PDFs, the safest user-facing behavior is:

```text
cover old text area with background-colored rectangle
insert new text box on top
leave original content stream mostly intact
```

This is not semantically perfect, but it is predictable for invoices, forms,
labels, annotations, and quick corrections.

Offer both modes:

```text
Visual replace
  safer, covers and inserts

Structural rewrite
  advanced, rewrites PDF text operators
```

## Architecture Ideas

Use separate services:

```text
TextEditingController
  handles keyboard, mouse, selection, cursor, IME

TextLayoutService
  converts text and style into visual lines and hit testing

PageScene
  owns page elements and z-order

PdfExtractionService
  parses existing page content into editable elements

PdfWriteService
  serializes elements into new PDF streams

FontService
  manages PDF fonts, fallback fonts, encoding, and embedding
```

## Hard Cases To Plan For

- PDF page rotation.
- Different crop box and media box.
- Text inside transformed coordinate systems.
- Fonts without Unicode maps.
- Ligatures such as `fi` and `fl`.
- Right-to-left text.
- Arabic shaping.
- CJK fonts.
- Vertical writing mode.
- Transparent text.
- Text used as a clipping mask.
- Text converted to vector paths.
- Scanned PDFs with no real text.

## Testing Ideas

Create a small PDF fixture set:

```text
plain-latin.pdf
rotated-page.pdf
wrapped-text.pdf
embedded-font.pdf
missing-tounicode.pdf
cjk.pdf
rtl.pdf
transparent-text.pdf
text-as-paths.pdf
scanned-image-only.pdf
```

For each fixture, test:

```text
can open
can render before edit
can add new text box
can save
can reopen saved PDF
can render after edit
page count unchanged
resources valid
content stream parses
common PDF viewers open it
```

## Feature Roadmap

Phase 1:

```text
insert text box
move and resize text box
style text box
save inserted text
undo and redo
```

Phase 2:

```text
extract existing text objects
select existing text object
show editable text script
rewrite selected object
preview rewrite
```

Phase 3:

```text
visual replace mode
font fallback and embedding
paragraph-like editing for simple PDFs
OCR-assisted replacement for scanned PDFs
batch find and replace
```

Phase 4:

```text
complex script shaping
right-to-left support
CJK vertical writing
accessibility text structure update
incremental save support
```

