// Client-side French/English detection, ported from Newsletter Digest's validated
// stopword-frequency approach (CLAUDE.md decision #4, SPEC.md §3). Runs once on the
// full pasted text before any Ollama call — never on partial/streamed content.

export type DetectedLanguage = 'fr' | 'en';

// Exact 24-word list from Newsletter Digest's source (`_FRENCH_MARKERS`) — do not modify.
const FRENCH_MARKERS = [
  'le',
  'la',
  'les',
  'de',
  'du',
  'des',
  'en',
  'un',
  'une',
  'est',
  'sont',
  'qui',
  'que',
  'dans',
  'sur',
  'par',
  'pour',
  'avec',
  'mais',
  'ou',
  'et',
  'donc',
  'car',
  'si',
];

const FRENCH_MARKERS_SET = new Set(FRENCH_MARKERS);

// French stopwords exceeding 8% of total words -> French, otherwise English.
const FRENCH_THRESHOLD = 0.08;

export function detectLanguage(text: string): DetectedLanguage {
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  if (words.length === 0) return 'en';

  const frenchCount = words.reduce(
    (count, word) => (FRENCH_MARKERS_SET.has(word) ? count + 1 : count),
    0
  );

  return frenchCount / words.length > FRENCH_THRESHOLD ? 'fr' : 'en';
}
