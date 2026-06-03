export function findWordBoundary(
  text: string,
  index: number
): { start: number; end: number } {
  const clamped = Math.max(0, Math.min(index, text.length));
  let start = clamped;
  let end = clamped;

  while (start > 0 && /\w/.test(text[start - 1])) start--;
  while (end < text.length && /\w/.test(text[end])) end++;

  if (start === end) {
    if (end < text.length) end++;
    else if (start > 0) start--;
  }

  return { start, end };
}
