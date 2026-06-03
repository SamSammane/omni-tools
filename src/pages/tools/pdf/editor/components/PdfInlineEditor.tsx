import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Slider,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_TEXT_BOX_HEIGHT,
  DEFAULT_TEXT_BOX_WIDTH,
  DEFAULT_TEXT_STYLE
} from '../constants';
import { createTextBoxState } from '../core/createTextBoxState';
import { commitTextBox } from '../core/commitTextBox';
import {
  fitTextBoxRect,
  hitCommittedBox,
  moveRect
} from '../core/fitTextBoxRect';
import { textBoxStateFromElement } from '../layout/canvasTextLayout';
import { drawCommittedTextBox } from '../layout/canvasTextLayout';
import { extractTextInRect } from '../pdf/extractTextInRect';
import { loadPdfDocument, renderPdfPageToCanvas } from '../pdf/renderPdfPage';
import { saveEditedPdf } from '../pdf/saveEditedPdf';
import { EditorHistory } from '../scene/editorHistory';
import { PageScene } from '../scene/PageScene';
import { screenToPdfPoint } from '../viewCoords';
import type {
  EditorTool,
  PageTextBoxElement,
  Rect,
  TextAlignment,
  TextBoxState
} from '../types';
import TextBoxEditor from './TextBoxEditor';

type Props = {
  file: File;
  onSaved: (file: File) => void;
};

type DragState =
  | { kind: 'create'; start: { x: number; y: number } }
  | {
      kind: 'move';
      index: number;
      start: { x: number; y: number };
      origin: Rect;
    }
  | null;

function pageIdForIndex(index: number): string {
  return `page-${index + 1}`;
}

export default function PdfInlineEditor({ file, onSaved }: Props) {
  const { t } = useTranslation('pdf');
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(new PageScene());
  const historyRef = useRef(new EditorHistory());

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [viewScale, setViewScale] = useState(1.25);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState<EditorTool>('text');
  const [activeTextBox, setActiveTextBox] = useState<TextBoxState | null>(null);
  const [draftRect, setDraftRect] = useState<Rect | null>(null);
  const [committedVersion, setCommittedVersion] = useState(0);
  const [selectedCommitted, setSelectedCommitted] = useState<number | null>(
    null
  );
  const [historyVersion, setHistoryVersion] = useState(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [style, setStyle] = useState(DEFAULT_TEXT_STYLE);

  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef(0);
  const dragRef = useRef<DragState>(null);
  const suppressBlurCommit = useRef(false);
  const restoreOnCancelRef = useRef<PageTextBoxElement | null>(null);

  const pageId = pageIdForIndex(pageIndex);

  const pushHistory = useCallback(() => {
    historyRef.current.push(sceneRef.current.toMap());
    setHistoryVersion((v) => v + 1);
  }, []);

  const committedOnPage = useMemo(() => {
    void committedVersion;
    return sceneRef.current.getElements(pageId);
  }, [pageId, committedVersion]);

  const canUndo = useMemo(() => {
    void historyVersion;
    return historyRef.current.canUndo();
  }, [historyVersion, committedVersion]);

  const canRedo = useMemo(() => {
    void historyVersion;
    return historyRef.current.canRedo();
  }, [historyVersion, committedVersion]);

  const bumpCommitted = () => setCommittedVersion((v) => v + 1);

  const redrawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || viewScale <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);

    committedOnPage.forEach((element, index) => {
      drawCommittedTextBox(ctx, element, selectedCommitted === index);
    });

    if (draftRect && !activeTextBox) {
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 1 / viewScale;
      ctx.setLineDash([4 / viewScale, 4 / viewScale]);
      ctx.strokeRect(
        draftRect.x,
        draftRect.y,
        draftRect.width,
        draftRect.height
      );
      ctx.setLineDash([]);
    }
  }, [activeTextBox, committedOnPage, draftRect, selectedCommitted, viewScale]);

  const redrawOverlayRef = useRef(redrawOverlay);
  redrawOverlayRef.current = redrawOverlay;

  const renderPage = useCallback(async () => {
    const base = baseCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    const pdf = pdfDocRef.current;
    if (!base || !overlay || !pdf) return;

    const taskId = ++renderTaskRef.current;
    setIsRendering(true);
    try {
      const info = await renderPdfPageToCanvas(pdf, pageIndex, base, viewScale);
      if (taskId !== renderTaskRef.current) return;
      overlay.width = base.width;
      overlay.height = base.height;
      setPageSize({ width: info.width, height: info.height });
      redrawOverlayRef.current();
    } catch (err) {
      if (taskId === renderTaskRef.current) {
        setLoadError(
          err instanceof Error ? err.message : 'Failed to render page'
        );
      }
    } finally {
      if (taskId === renderTaskRef.current) setIsRendering(false);
    }
  }, [pageIndex, viewScale]);

  useEffect(() => {
    let cancelled = false;
    const taskId = ++renderTaskRef.current;

    setIsLoadingPdf(true);
    setLoadError(null);
    pdfDocRef.current = null;

    sceneRef.current.clear();
    historyRef.current.clear();
    setActiveTextBox(null);
    setDraftRect(null);
    setSelectedCommitted(null);
    setPageIndex(0);
    bumpCommitted();
    setHistoryVersion(0);

    void loadPdfDocument(file)
      .then((pdf) => {
        if (cancelled || taskId !== renderTaskRef.current) {
          void pdf.destroy();
          return;
        }
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
        setIsLoadingPdf(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load PDF'
          );
          setIsLoadingPdf(false);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current += 1;
      const doc = pdfDocRef.current;
      pdfDocRef.current = null;
      if (doc) void doc.destroy();
    };
  }, [file]);

  useLayoutEffect(() => {
    if (!isLoadingPdf && pdfDocRef.current) {
      void renderPage();
    }
  }, [isLoadingPdf, pageIndex, viewScale, renderPage]);

  useEffect(() => {
    redrawOverlay();
  }, [redrawOverlay]);

  const commitActive = useCallback(() => {
    if (!activeTextBox) return;
    const fitted = fitTextBoxRect(activeTextBox);
    const element = commitTextBox(fitted);
    setActiveTextBox(null);
    restoreOnCancelRef.current = null;
    if (element) {
      pushHistory();
      sceneRef.current.addElement(element);
      bumpCommitted();
    }
  }, [activeTextBox, pushHistory]);

  const cancelActive = useCallback(() => {
    if (restoreOnCancelRef.current) {
      sceneRef.current.addElement(restoreOnCancelRef.current);
      restoreOnCancelRef.current = null;
      bumpCommitted();
    }
    setActiveTextBox(null);
    setDraftRect(null);
  }, []);

  const openElementForEdit = (
    element: PageTextBoxElement,
    indexOnPage: number
  ) => {
    suppressBlurCommit.current = true;
    pushHistory();
    sceneRef.current.removeElement(pageId, indexOnPage);
    bumpCommitted();
    restoreOnCancelRef.current = element;
    const state = textBoxStateFromElement(element);
    setActiveTextBox({
      ...state,
      cursorIndex: state.text.length,
      selectionStart: 0,
      selectionEnd: state.text.length
    });
    setSelectedCommitted(null);
  };

  const pdfPoint = (clientX: number, clientY: number) => {
    const canvas = overlayCanvasRef.current ?? baseCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return screenToPdfPoint(clientX, clientY, canvas, viewScale);
  };

  const startTextBoxAt = async (rect: Rect) => {
    let state = createTextBoxState(pageId, rect, style, pageSize);
    const pdf = pdfDocRef.current;
    if (pdf && pageSize.height > 0) {
      try {
        const originalText = await extractTextInRect(
          pdf,
          pageIndex,
          rect,
          pageSize.height
        );
        if (originalText) {
          state = {
            ...state,
            text: originalText,
            originalText,
            cursorIndex: originalText.length,
            selectionStart: 0,
            selectionEnd: originalText.length
          };
        }
      } catch {
        /* extraction is best-effort */
      }
    }
    setActiveTextBox(fitTextBoxRect(state));
    setDraftRect(null);
    setSelectedCommitted(null);
  };

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (activeTextBox) return;
    const point = pdfPoint(e.clientX, e.clientY);

    if (tool === 'text') {
      dragRef.current = { kind: 'create', start: point };
      setDraftRect({
        x: point.x,
        y: point.y,
        width: 0,
        height: 0
      });
      return;
    }

    const hit = hitCommittedBox(point, committedOnPage);
    if (hit !== null) {
      setSelectedCommitted(hit);
      const el = committedOnPage[hit];
      pushHistory();
      dragRef.current = {
        kind: 'move',
        index: hit,
        start: point,
        origin: { ...el.rect }
      };
      return;
    }
    setSelectedCommitted(null);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pdfPoint(e.clientX, e.clientY);

    if (drag.kind === 'create') {
      const x = Math.min(drag.start.x, point.x);
      const y = Math.min(drag.start.y, point.y);
      const width = Math.max(8, Math.abs(point.x - drag.start.x));
      const height = Math.max(8, Math.abs(point.y - drag.start.y));
      setDraftRect({ x, y, width, height });
      return;
    }

    if (drag.kind === 'move') {
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      const nextRect = moveRect(drag.origin, dx, dy, {
        x: 0,
        y: 0,
        width: pageSize.width,
        height: pageSize.height
      });
      const el = committedOnPage[drag.index];
      sceneRef.current.updateElement(pageId, drag.index, {
        ...el,
        rect: nextRect
      });
      bumpCommitted();
    }
  };

  const handleOverlayMouseUp = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag) return;

    if (drag.kind === 'move') {
      return;
    }

    const point = pdfPoint(e.clientX, e.clientY);
    const x = Math.min(drag.start.x, point.x);
    const y = Math.min(drag.start.y, point.y);
    let width = Math.abs(point.x - drag.start.x);
    let height = Math.abs(point.y - drag.start.y);

    if (width < 12 && height < 12) {
      width = DEFAULT_TEXT_BOX_WIDTH;
      height = DEFAULT_TEXT_BOX_HEIGHT;
      void startTextBoxAt({ x: point.x, y: point.y, width, height });
      return;
    }

    void startTextBoxAt({
      x,
      y,
      width: Math.max(40, width),
      height: Math.max(24, height)
    });
  };

  const handleOverlayDoubleClick = (e: React.MouseEvent) => {
    if (activeTextBox) return;
    const point = pdfPoint(e.clientX, e.clientY);
    const hit = hitCommittedBox(point, committedOnPage);
    if (hit !== null) {
      openElementForEdit(committedOnPage[hit], hit);
    }
  };

  useEffect(() => {
    if (!activeTextBox) return;
    setActiveTextBox((prev) =>
      prev ? fitTextBoxRect({ ...prev, style: { ...style } }) : prev
    );
  }, [
    style.fontSize,
    style.fillColor,
    style.alignment,
    style.bold,
    style.italic
  ]);

  const handleSave = async () => {
    if (activeTextBox) {
      suppressBlurCommit.current = true;
      commitActive();
    }
    setIsSaving(true);
    try {
      const out = await saveEditedPdf(file, sceneRef.current);
      onSaved(out);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSelected = () => {
    if (selectedCommitted === null) return;
    pushHistory();
    sceneRef.current.removeElement(pageId, selectedCommitted);
    setSelectedCommitted(null);
    bumpCommitted();
  };

  const undo = useCallback(() => {
    const snap = historyRef.current.undo(sceneRef.current.toMap());
    if (snap) {
      sceneRef.current.replaceAll(snap);
      setActiveTextBox(null);
      restoreOnCancelRef.current = null;
      setSelectedCommitted(null);
      bumpCommitted();
      setHistoryVersion((v) => v + 1);
    }
  }, []);

  const redo = useCallback(() => {
    const snap = historyRef.current.redo(sceneRef.current.toMap());
    if (snap) {
      sceneRef.current.replaceAll(snap);
      setActiveTextBox(null);
      restoreOnCancelRef.current = null;
      setSelectedCommitted(null);
      bumpCommitted();
      setHistoryVersion((v) => v + 1);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        sx={{ mb: 1 }}
        onMouseDown={() => {
          suppressBlurCommit.current = true;
        }}
      >
        <ButtonGroup size="small" variant="outlined">
          <Tooltip title={t('editor.tools.text')}>
            <Button
              variant={tool === 'text' ? 'contained' : 'outlined'}
              onClick={() => {
                cancelActive();
                setTool('text');
              }}
            >
              <Icon icon="mdi:format-text" />
            </Button>
          </Tooltip>
          <Tooltip title={t('editor.tools.select')}>
            <Button
              variant={tool === 'select' ? 'contained' : 'outlined'}
              onClick={() => {
                cancelActive();
                setTool('select');
              }}
            >
              <Icon icon="mdi:cursor-default" />
            </Button>
          </Tooltip>
        </ButtonGroup>

        <Select
          size="small"
          value={style.fontSize}
          onChange={(e) =>
            setStyle((s) => ({ ...s, fontSize: Number(e.target.value) }))
          }
          sx={{ width: 72 }}
        >
          {[10, 12, 14, 16, 18, 24, 32, 48].map((size) => (
            <MenuItem key={size} value={size}>
              {size}
            </MenuItem>
          ))}
        </Select>

        <input
          type="color"
          value={style.fillColor}
          onChange={(e) =>
            setStyle((s) => ({ ...s, fillColor: e.target.value }))
          }
          title={t('editor.textColor')}
          style={{ width: 36, height: 32, border: 'none', cursor: 'pointer' }}
        />

        <ButtonGroup size="small" variant="outlined">
          {(['left', 'center', 'right'] as TextAlignment[]).map((align) => (
            <Button
              key={align}
              variant={style.alignment === align ? 'contained' : 'outlined'}
              onClick={() => setStyle((s) => ({ ...s, alignment: align }))}
            >
              <Icon icon={`mdi:format-align-${align}`} />
            </Button>
          ))}
        </ButtonGroup>

        <Tooltip title={t('editor.undo')}>
          <span>
            <IconButton size="small" disabled={!canUndo} onClick={undo}>
              <Icon icon="mdi:undo" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('editor.redo')}>
          <span>
            <IconButton size="small" disabled={!canRedo} onClick={redo}>
              <Icon icon="mdi:redo" />
            </IconButton>
          </span>
        </Tooltip>

        <Box sx={{ width: 120, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="mdi:magnify-minus-outline" width={18} />
          <Slider
            size="small"
            min={0.75}
            max={2.5}
            step={0.25}
            value={viewScale}
            onChange={(_, v) => {
              commitActive();
              setViewScale(v as number);
            }}
          />
          <Icon icon="mdi:magnify-plus-outline" width={18} />
        </Box>

        <ButtonGroup size="small" variant="outlined">
          <IconButton
            size="small"
            disabled={pageIndex <= 0}
            onClick={() => {
              commitActive();
              setPageIndex((p) => p - 1);
            }}
          >
            <Icon icon="mdi:chevron-left" />
          </IconButton>
          <Typography variant="body2" sx={{ px: 1, alignSelf: 'center' }}>
            {t('editor.pageIndicator', {
              current: pageIndex + 1,
              total: pageCount || 1
            })}
          </Typography>
          <IconButton
            size="small"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => {
              commitActive();
              setPageIndex((p) => p + 1);
            }}
          >
            <Icon icon="mdi:chevron-right" />
          </IconButton>
        </ButtonGroup>

        {activeTextBox && (
          <Button size="small" variant="outlined" onClick={commitActive}>
            {t('editor.done')}
          </Button>
        )}

        <Button
          size="small"
          variant="contained"
          disabled={isSaving}
          onClick={() => void handleSave()}
          startIcon={
            isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Icon icon="mdi:content-save" />
            )
          }
        >
          {t('editor.savePdf')}
        </Button>

        {selectedCommitted !== null && !activeTextBox && (
          <>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                openElementForEdit(
                  committedOnPage[selectedCommitted],
                  selectedCommitted
                )
              }
              startIcon={<Icon icon="mdi:pencil" />}
            >
              {t('editor.editBox')}
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={deleteSelected}
              startIcon={<Icon icon="mdi:delete" />}
            >
              {t('editor.deleteBox')}
            </Button>
          </>
        )}
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1 }}
      >
        {t('editor.hint')}
      </Typography>

      <Box
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && activeTextBox) commitActive();
        }}
        sx={{
          position: 'relative',
          overflow: 'auto',
          maxHeight: '70vh',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.200',
          outline: 'none'
        }}
      >
        {(isLoadingPdf || isRendering) && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              zIndex: 4,
              bgcolor: 'rgba(255,255,255,0.6)'
            }}
          >
            <CircularProgress />
            <Typography variant="caption" color="text.secondary">
              {isLoadingPdf
                ? t('editor.loadingPdf')
                : t('editor.renderingPage')}
            </Typography>
          </Box>
        )}
        {loadError && (
          <Typography color="error" sx={{ p: 2 }}>
            {loadError}
          </Typography>
        )}
        <Box
          sx={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}
        >
          <canvas
            ref={baseCanvasRef}
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          />
          <canvas
            ref={overlayCanvasRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              cursor:
                tool === 'text' && !activeTextBox ? 'crosshair' : 'default'
            }}
            onMouseDown={handleOverlayMouseDown}
            onMouseMove={handleOverlayMouseMove}
            onMouseUp={handleOverlayMouseUp}
            onDoubleClick={handleOverlayDoubleClick}
          />
          {activeTextBox && (
            <TextBoxEditor
              state={activeTextBox}
              viewScale={viewScale}
              canvas={baseCanvasRef.current}
              onChange={setActiveTextBox}
              onCommit={commitActive}
              onCancel={cancelActive}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
