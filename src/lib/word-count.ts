// Shared word-count logic, extracted so the count displayed to the user (PasteArea,
// SPEC.md §2.2) and the target-point calculation (prompts.ts, SPEC.md §4) never diverge
// on edge cases like double spaces or stray punctuation.

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
