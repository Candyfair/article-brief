import { describe, expect, it } from 'vitest';
import { wordCount } from './word-count';

describe('wordCount', () => {
  it('counts whitespace-separated words', () => {
    expect(wordCount('one two three')).toBe(3);
  });

  it('returns 0 for an empty string', () => {
    expect(wordCount('')).toBe(0);
  });

  it('returns 0 for whitespace-only text', () => {
    expect(wordCount('   \n\t  ')).toBe(0);
  });

  it('collapses multiple spaces/newlines between words instead of counting them', () => {
    expect(wordCount('one   two\n\nthree')).toBe(3);
  });

  it('ignores leading/trailing whitespace', () => {
    expect(wordCount('  padded text  ')).toBe(2);
  });
});
