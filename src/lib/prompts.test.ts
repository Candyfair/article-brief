import { describe, expect, it } from 'vitest';
import { buildEnglishPrompt, GENERATION_PARAMS } from './prompts';

describe('buildEnglishPrompt', () => {
  it('embeds the full, untruncated article text (SPEC.md §2.3: never truncated)', () => {
    const longArticle = 'word '.repeat(5000).trim();
    const prompt = buildEnglishPrompt(longArticle);
    expect(prompt).toContain(longArticle);
  });

  it('instructs the intro-sentence / blank-line / em-dash bullet structure', () => {
    const prompt = buildEnglishPrompt('some article text');
    expect(prompt).toContain('—');
    expect(prompt.toLowerCase()).toContain('introductory sentence');
    expect(prompt.toLowerCase()).toContain('bullet point');
  });

  it('does not impose a structured format like JSON', () => {
    const prompt = buildEnglishPrompt('some article text');
    expect(prompt.toLowerCase()).toContain('no json');
  });
});

describe('GENERATION_PARAMS', () => {
  it('matches the SPEC.md §4 values', () => {
    expect(GENERATION_PARAMS).toEqual({
      temperature: 0.2,
      num_ctx: 8192,
      num_predict: 1100,
    });
  });

  it('never includes a stop token', () => {
    expect('stop' in GENERATION_PARAMS).toBe(false);
  });
});
