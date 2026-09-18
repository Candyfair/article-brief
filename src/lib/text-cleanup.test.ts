import { describe, expect, it } from 'vitest';
import { stripBareUrlLines } from './text-cleanup';

describe('stripBareUrlLines', () => {
  it('removes a line that is only a URL, leaving the rest of the text unchanged', () => {
    const text = 'Some intro text.\nhttps://example.com/article\nThe rest of the article.';
    expect(stripBareUrlLines(text)).toBe('Some intro text.\nThe rest of the article.');
  });

  it('removes a standalone URL line surrounded by blank lines', () => {
    const text = 'Some intro text.\n\nhttps://example.com/article\n\nThe rest of the article.';
    expect(stripBareUrlLines(text)).toBe('Some intro text.\n\n\nThe rest of the article.');
  });

  it('removes multiple standalone URL lines in the same text', () => {
    const text =
      'https://example.com/share\nArticle body starts here.\nMore body text.\nhttp://example.com/legal';
    expect(stripBareUrlLines(text)).toBe('Article body starts here.\nMore body text.');
  });

  it('leaves a URL embedded within a sentence untouched', () => {
    const text = 'For more information, see more at https://example.com for details.';
    expect(stripBareUrlLines(text)).toBe(text);
  });

  it('leaves text with no URL at all unchanged (identity)', () => {
    const text = 'Just an ordinary article with no links anywhere in it.';
    expect(stripBareUrlLines(text)).toBe(text);
  });

  it('tolerates leading/trailing whitespace around an otherwise-bare URL line', () => {
    const text = 'Intro.\n   https://example.com/article   \nBody.';
    expect(stripBareUrlLines(text)).toBe('Intro.\nBody.');
  });
});
