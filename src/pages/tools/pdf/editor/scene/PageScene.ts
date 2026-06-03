import type { PageId, PageTextBoxElement } from '../types';

export class PageScene {
  private elements = new Map<PageId, PageTextBoxElement[]>();

  getElements(pageId: PageId): PageTextBoxElement[] {
    return this.elements.get(pageId) ?? [];
  }

  addElement(element: PageTextBoxElement): void {
    const list = this.elements.get(element.pageId) ?? [];
    this.elements.set(element.pageId, [...list, element]);
  }

  removeElement(pageId: PageId, index: number): void {
    const list = this.elements.get(pageId) ?? [];
    this.elements.set(
      pageId,
      list.filter((_, i) => i !== index)
    );
  }

  updateElement(
    pageId: PageId,
    index: number,
    element: PageTextBoxElement
  ): void {
    const list = [...(this.elements.get(pageId) ?? [])];
    list[index] = element;
    this.elements.set(pageId, list);
  }

  allElements(): PageTextBoxElement[] {
    return [...this.elements.values()].flat();
  }

  clear(): void {
    this.elements.clear();
  }

  replaceAll(snapshot: Map<string, PageTextBoxElement[]>): void {
    this.elements.clear();
    for (const [pageId, list] of snapshot) {
      this.elements.set(pageId, list);
    }
  }

  toMap(): Map<string, PageTextBoxElement[]> {
    return new Map(this.elements);
  }
}
