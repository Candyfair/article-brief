import { describe, expect, it } from 'vitest';
import { parseStreamingSummary } from './streaming-parser';

describe('parseStreamingSummary', () => {
  it('treats everything as an in-progress intro before the first blank line arrives', () => {
    const result = parseStreamingSummary('The article discusses', false);
    expect(result).toEqual({ intro: 'The article discusses', introComplete: false, bullets: [] });
  });

  it('completes the intro once a blank line appears, even with no bullets yet', () => {
    const result = parseStreamingSummary('The article discusses trade policy.\n\n', false);
    expect(result.intro).toBe('The article discusses trade policy.');
    expect(result.introComplete).toBe(true);
    expect(result.bullets).toEqual([]);
  });

  it('holds back the bullet still being written until it is finalized', () => {
    const rawText = 'Intro sentence.\n\n— first point is still bei';
    const result = parseStreamingSummary(rawText, false);
    expect(result.introComplete).toBe(true);
    expect(result.bullets).toEqual([]);
  });

  it('finalizes a bullet as soon as the next one starts', () => {
    const rawText = 'Intro sentence.\n\n— first point\n— second point is still forming';
    const result = parseStreamingSummary(rawText, false);
    expect(result.bullets).toEqual(['— first point']);
  });

  it('finalizes the last bullet once the stream is done', () => {
    const rawText = 'Intro sentence.\n\n— first point\n— second point';
    const result = parseStreamingSummary(rawText, true);
    expect(result.bullets).toEqual(['— first point', '— second point']);
  });

  it('merges wrapped continuation lines into the bullet they belong to', () => {
    const rawText = 'Intro sentence.\n\n— a point that wraps\nonto a second line\n— another point';
    const result = parseStreamingSummary(rawText, true);
    expect(result.bullets).toEqual(['— a point that wraps onto a second line', '— another point']);
  });

  it('degrades gracefully on malformed output with no blank-line/dash structure once done (SPEC.md §8)', () => {
    const rawText = 'Just a wall of text with no structure at all.';
    const result = parseStreamingSummary(rawText, true);
    expect(result).toEqual({
      intro: 'Just a wall of text with no structure at all.',
      introComplete: true,
      bullets: [],
    });
  });

  it('keeps malformed output in-progress while the stream is still open', () => {
    const rawText = 'Just a wall of text with no structure so far';
    const result = parseStreamingSummary(rawText, false);
    expect(result.introComplete).toBe(false);
  });
});
