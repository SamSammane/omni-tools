import type { PageTextBoxElement } from '../types';

export type SceneSnapshot = Map<string, PageTextBoxElement[]>;

export class EditorHistory {
  private undoStack: SceneSnapshot[] = [];
  private redoStack: SceneSnapshot[] = [];

  private cloneScene(
    elements: Map<string, PageTextBoxElement[]>
  ): SceneSnapshot {
    const snap = new Map<string, PageTextBoxElement[]>();
    for (const [key, list] of elements) {
      snap.set(
        key,
        list.map((el) => ({
          ...el,
          rect: { ...el.rect },
          style: { ...el.style },
          transform: { ...el.transform },
          text: el.text,
          originalText: el.originalText
        }))
      );
    }
    return snap;
  }

  push(elements: Map<string, PageTextBoxElement[]>): void {
    this.undoStack.push(this.cloneScene(elements));
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(current: Map<string, PageTextBoxElement[]>): SceneSnapshot | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(this.cloneScene(current));
    return prev;
  }

  redo(current: Map<string, PageTextBoxElement[]>): SceneSnapshot | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(this.cloneScene(current));
    return next;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
