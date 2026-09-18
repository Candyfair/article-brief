// Client-side French/English detection, ported from Newsletter Digest's validated
// stopword-frequency approach and refined for Article Brief's longer, more quote-heavy
// full articles (CLAUDE.md decision #4, SPEC.md §3). Runs once on the full pasted text
// before any Ollama call — never on partial/streamed content.

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

// English counterpart, structurally matched to FRENCH_MARKERS by category (articles,
// common prepositions, conjunctions, forms of "to be", relative pronouns) and kept
// disjoint from it. Added to compare proportional density in both languages rather than
// a single French-only threshold, which skewed French on a real mixed-content repro: a
// short but stopword-dense French sentence appended to English paragraphs (SPEC.md §3).
const ENGLISH_MARKERS = [
  'the',
  'a',
  'of',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'from',
  'to',
  'but',
  'or',
  'and',
  'so',
  'because',
  'if',
  'is',
  'are',
  'was',
  'were',
  'who',
  'that',
  'which',
];

const FRENCH_MARKERS_SET = new Set(FRENCH_MARKERS);
const ENGLISH_MARKERS_SET = new Set(ENGLISH_MARKERS);

// Detected language = whichever marker list has the higher density (% of total words).
// Ties (including all-zero, e.g. no stopwords at all) default to English.
export function detectLanguage(text: string): DetectedLanguage {
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  if (words.length === 0) return 'en';

  let frenchCount = 0;
  let englishCount = 0;
  for (const word of words) {
    if (FRENCH_MARKERS_SET.has(word)) frenchCount++;
    else if (ENGLISH_MARKERS_SET.has(word)) englishCount++;
  }

  const frenchDensity = frenchCount / words.length;
  const englishDensity = englishCount / words.length;

  return frenchDensity > englishDensity ? 'fr' : 'en';
}
