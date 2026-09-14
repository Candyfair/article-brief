// Incremental parser for the streaming output contract (SPEC.md §4): text before the
// first blank line is the intro sentence, each subsequent line starting with "—" is a
// new bullet. Called on the accumulated raw text as each token arrives, not just once
// the stream closes.

export interface ParsedSummary {
  intro: string;
  introComplete: boolean;
  bullets: string[];
}

// `isDone` marks that the stream has closed. It matters in two ways: it's what lets a
// bullet still being written finalize (bullets "appear one by one" once complete, not
// character by character), and it's what triggers the SPEC.md §8 malformed-output
// fallback — if no blank line ever showed up, treat the whole response as the intro
// rather than leaving it stuck "in progress" forever.
export function parseStreamingSummary(rawText: string, isDone: boolean): ParsedSummary {
  const blankLineIndex = rawText.indexOf('\n\n');

  if (blankLineIndex === -1) {
    if (isDone) {
      return { intro: rawText.trim(), introComplete: true, bullets: [] };
    }
    return { intro: rawText, introComplete: false, bullets: [] };
  }

  const intro = rawText.slice(0, blankLineIndex).trim();
  const rest = rawText.slice(blankLineIndex + 2);

  const bullets: string[] = [];
  let current = '';

  for (const line of rest.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('—')) {
      if (current !== '') bullets.push(current);
      current = trimmed;
    } else if (trimmed !== '') {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  // The bullet still being written only finalizes once the stream ends — while it's
  // still forming, it isn't shown yet.
  if (isDone && current !== '') bullets.push(current);

  return { intro, introComplete: true, bullets };
}
