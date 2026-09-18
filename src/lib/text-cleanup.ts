// Client-side cleanup applied only to the copy of the pasted text used for language
// detection and prompt building — never to the textarea's own state or the "back to
// source" content (SPEC.md §2.8), and never to the word count (SPEC.md §2.2).
//
// Scope is deliberately narrow: only a line that is nothing but a URL. Legal notices,
// sharing instructions, and other site boilerplate are left for the model to ignore per
// the prompt instructions (SPEC.md §4) — not a gap to close later, see SPEC.md §2.

const BARE_URL_LINE = /^https?:\/\/\S+$/;

export function stripBareUrlLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !BARE_URL_LINE.test(line.trim()))
    .join('\n');
}
