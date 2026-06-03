import type {
  Point,
  TextBoxState,
  TextLayout,
  ViewportTransforms
} from '../types';
import { layoutTextBox } from '../layout/canvasTextLayout';

export function pagePointToLocal(
  pagePoint: Point,
  rect: { x: number; y: number }
): Point {
  return { x: pagePoint.x - rect.x, y: pagePoint.y - rect.y };
}

export function hitTestTextBox(
  state: TextBoxState,
  screenPoint: Point,
  transforms: ViewportTransforms,
  layout: TextLayout = layoutTextBox(state)
): number {
  const pagePoint = transforms.screenToPage(screenPoint);
  const local = pagePointToLocal(pagePoint, state.rect);
  const clampedY = Math.max(0, Math.min(local.y, layout.contentHeight));
  return layout.indexAtPoint({ x: local.x, y: clampedY });
}

export function setSelectionFromHit(
  state: TextBoxState,
  index: number,
  extend: boolean
): TextBoxState {
  if (extend) {
    return { ...state, cursorIndex: index, selectionEnd: index };
  }
  return {
    ...state,
    cursorIndex: index,
    selectionStart: index,
    selectionEnd: index
  };
}
