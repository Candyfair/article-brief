import { describe, expect, it } from 'vitest';
import { buildEnglishPrompt, buildFrenchPrompt, GENERATION_PARAMS } from './prompts';

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
    expect(prompt.toLowerCase()).toContain('bullet points');
  });

  it('is written entirely in English', () => {
    const prompt = buildEnglishPrompt('some article text');
    expect(prompt).toContain('Write only in English.');
  });
});

describe('buildFrenchPrompt', () => {
  it('embeds the full, untruncated article text (SPEC.md §2.3: never truncated)', () => {
    const longArticle = 'mot '.repeat(5000).trim();
    const prompt = buildFrenchPrompt(longArticle);
    expect(prompt).toContain(longArticle);
  });

  it('instructs the intro-sentence / blank-line / em-dash bullet structure', () => {
    const prompt = buildFrenchPrompt('un texte d\'article');
    expect(prompt).toContain('—');
    expect(prompt.toLowerCase()).toContain("phrase d'introduction");
    expect(prompt.toLowerCase()).toContain('points');
  });

  it('is written entirely in French, no English framing mixed in (SPEC.md §4)', () => {
    const prompt = buildFrenchPrompt('un texte d\'article');
    expect(prompt).toContain('Rédige uniquement en français.');
    // Guard against accidentally reintroducing the English prompt's framing.
    expect(prompt.toLowerCase()).not.toContain('summarize');
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
