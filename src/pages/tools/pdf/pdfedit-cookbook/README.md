# PDF Edit Cookbook

Located at `src/pages/tools/pdf/pdfedit-cookbook/`. The live PDF Editor tool
(`src/pages/tools/pdf/editor/`) implements the Phase 1 MVP from this guide.

This folder is a clean-room cookbook for building inline text editing in a PDF editor.
It is based on the architecture pattern observed in PDF4QT, but it is written as
implementation guidance rather than copied source code.

The main idea is to separate the PDF editor into four layers:

1. Interactive text editing
2. Page-space element model
3. PDF content stream extraction
4. PDF content stream serialization

Do not treat inline PDF text editing as one function. A reliable editor needs a
small text editor model for live typing, plus a PDF writer that commits the final
result to the page content stream.

## Files

- [01-inline-text-editor.md](01-inline-text-editor.md)
  - Algorithm for drawing, typing, selection, cursor movement, hit testing, and
    committing new inline text boxes.
- [02-existing-text-rewrite.md](02-existing-text-rewrite.md)
  - Algorithm for editing text that already exists in a PDF page.
- [03-function-contracts.md](03-function-contracts.md)
  - Suggested data structures and function contracts for implementing the system.
- [04-implementation-ideas.md](04-implementation-ideas.md)
  - Product ideas, MVP path, hard cases, tests, and roadmap notes.

## Recommended Build Order

1. Build new text insertion first.
2. Add selection, cursor movement, copy, paste, undo, and style changes.
3. Add save-to-PDF by generating a new content stream for inserted text boxes.
4. Add existing-text extraction as a separate feature.
5. Add existing-text replacement only after the serializer is well tested.

## Core Rule

The UI text editor should not mutate PDF operators while the user types.

Instead:

```text
keyboard and mouse input
  -> editable text model
  -> visual layout
  -> committed page element
  -> PDF content stream serialization
```

This keeps the live editing code simple and keeps PDF-specific failure modes out
of the normal typing workflow.

