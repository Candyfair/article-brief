import { describe, expect, it } from 'vitest';
import {
  buildEnglishPrompt,
  buildFrenchPrompt,
  buildGenerationParams,
  computeNumPredict,
  computeTargetPoints,
} from './prompts';
import type { ModelProfile } from './model-profiles';

const FAKE_LOCAL_PROFILE: ModelProfile = {
  id: 'local',
  label: 'modèle local',
  model: 'fake-local-model',
  baseUrl: () => 'http://fake-local',
  generation: {},
};

const FAKE_REMOTE_PROFILE: ModelProfile = {
  id: 'remote',
  label: 'modèle distant',
  model: 'fake-remote-model',
  baseUrl: () => 'http://fake-remote',
  generation: { reasoningAllowance: 300, numCtx: 9000 },
};

describe('computeTargetPoints', () => {
  it('targets roughly one point per 300 words of article', () => {
    expect(computeTargetPoints(1500)).toBe(5);
    expect(computeTargetPoints(2400)).toBe(8);
  });

  it('clamps to a minimum of 3 points for very short articles', () => {
    expect(computeTargetPoints(0)).toBe(3);
    expect(computeTargetPoints(300)).toBe(3);
  });

  it('clamps to a maximum of 10 points for very long articles', () => {
    expect(computeTargetPoints(6000)).toBe(10);
    expect(computeTargetPoints(50000)).toBe(10);
  });
});

describe('computeNumPredict', () => {
  it('scales with article word count (Math.round(wordCount * 0.65) + 350) — independent of computeTargetPoints', () => {
    expect(computeNumPredict(1000)).toBe(1000);
    expect(computeNumPredict(2150)).toBe(1748);
  });

  it('clamps to a minimum of 500 for very short articles', () => {
    expect(computeNumPredict(0)).toBe(500);
    expect(computeNumPredict(100)).toBe(500);
  });

  it('clamps to a maximum of 2200 for very long articles', () => {
    expect(computeNumPredict(2900)).toBe(2200);
    expect(computeNumPredict(10000)).toBe(2200);
  });
});

describe('buildGenerationParams', () => {
  it('combines the fixed temperature with the profile default num_ctx and the computed num_predict, unchanged when the profile has no overrides (SPEC.md §4)', () => {
    expect(buildGenerationParams(FAKE_LOCAL_PROFILE, 1455)).toEqual({
      temperature: 0.2,
      num_ctx: 8192,
      num_predict: 1455,
    });
  });

  it('applies profile generation overrides — numCtx replaces the default, reasoningAllowance adds onto num_predict (SPEC.md §4/§9)', () => {
    expect(buildGenerationParams(FAKE_REMOTE_PROFILE, 1455)).toEqual({
      temperature: 0.2,
      num_ctx: 9000,
      num_predict: 1755,
    });
  });

  it('never includes a stop token', () => {
    expect('stop' in buildGenerationParams(FAKE_LOCAL_PROFILE, 1455)).toBe(false);
  });
});

describe('buildEnglishPrompt', () => {
  it('embeds the full, untruncated article text (SPEC.md §2.3: never truncated)', () => {
    const longArticle = 'word '.repeat(5000).trim();
    const prompt = buildEnglishPrompt(longArticle, 5);
    expect(prompt).toContain(longArticle);
  });

  it('instructs the intro-sentence / blank-line / em-dash bullet structure', () => {
    const prompt = buildEnglishPrompt('some article text', 5);
    expect(prompt).toContain('—');
    expect(prompt.toLowerCase()).toContain('introductory sentence');
  });

  it('is written entirely in English', () => {
    const prompt = buildEnglishPrompt('some article text', 5);
    expect(prompt).toContain('Write only in English.');
  });

  it('interpolates the target point count into both the main paragraph and the reminder (SPEC.md §4: a soft continuation anchor, not a literal target)', () => {
    const prompt = buildEnglishPrompt('some article text', 7);
    expect(prompt).toContain('about 7 points');
  });

  it('instructs the intro sentence to never reuse the headline verbatim', () => {
    const prompt = buildEnglishPrompt('some article text', 5);
    expect(prompt).toContain('never reusing its headline verbatim');
  });

  it('instructs full-article coverage rather than focusing only on the opening (regression: model stopped after the first half of a long article)', () => {
    const prompt = buildEnglishPrompt('some article text', 5);
    expect(prompt).toContain('cover the entire text');
    expect(prompt).toContain('rather than focusing only on its opening sections');
  });

  it('places the grouping instruction before the one-point-per-line/em-dash formatting instruction (order is intentional, not incidental)', () => {
    const prompt = buildEnglishPrompt('some article text', 5);
    const groupingIndex = prompt.indexOf('Group related ideas under a single point');
    const formatIndex = prompt.indexOf(
      'Write one point per line, each line starting with an em dash'
    );
    expect(groupingIndex).toBeGreaterThanOrEqual(0);
    expect(formatIndex).toBeGreaterThan(groupingIndex);
  });

  it('sandwiches a full reminder (target point count, coverage, grouping, and format) after the article text (regression: on a long article, a cap-only reminder became the dominant instruction by recency, and the model dropped the intro/blank-line/em-dash structure)', () => {
    const articleText = 'some article text';
    const prompt = buildEnglishPrompt(articleText, 5);
    const articleIndex = prompt.indexOf(articleText);
    const upfrontIndex = prompt.indexOf('Read the article provided below carefully');
    const reminderIndex = prompt.indexOf('Reminder: the text above may include');

    expect(upfrontIndex).toBeGreaterThanOrEqual(0);
    expect(upfrontIndex).toBeLessThan(articleIndex);
    expect(reminderIndex).toBeGreaterThan(articleIndex);

    const reminder = prompt.slice(reminderIndex);
    expect(reminder).toContain('introductory sentence');
    expect(reminder).toContain('blank line');
    expect(reminder).toContain('em dash (—)');
    expect(reminder).toContain('about 5 points covering the article from start to finish');
    expect(reminder).toContain('grouping related ideas under a single point');
  });

  it('instructs the model to ignore boilerplate (sharing/legal/URL) before the real article start, both upfront and in the reminder (regression: pasted text with site boilerplate before the real content caused a paraphrased-opening-sentence heading)', () => {
    const prompt = buildEnglishPrompt('some article text', 5);
    expect(prompt).toContain(
      'The provided text may be preceded by sharing instructions, legal notices, or a URL before the article actually begins'
    );
    expect(prompt).toContain('Reminder: the text above may include sharing instructions');
    expect(prompt).toContain('never a separate title or heading line');
  });
});

describe('buildFrenchPrompt', () => {
  it('embeds the full, untruncated article text (SPEC.md §2.3: never truncated)', () => {
    const longArticle = 'mot '.repeat(5000).trim();
    const prompt = buildFrenchPrompt(longArticle, 5);
    expect(prompt).toContain(longArticle);
  });

  it('instructs the intro-sentence / blank-line / em-dash bullet structure', () => {
    const prompt = buildFrenchPrompt("un texte d'article", 5);
    expect(prompt).toContain('—');
    expect(prompt.toLowerCase()).toContain("phrase d'introduction");
  });

  it('is written entirely in French, no English framing mixed in (SPEC.md §4)', () => {
    const prompt = buildFrenchPrompt("un texte d'article", 5);
    expect(prompt).toContain('Rédige uniquement en français.');
    // Guard against accidentally reintroducing the English prompt's framing.
    expect(prompt.toLowerCase()).not.toContain('summarize');
  });

  it('interpolates the target point count into both the main paragraph and the reminder (SPEC.md §4: a soft continuation anchor, not a literal target)', () => {
    const prompt = buildFrenchPrompt("un texte d'article", 7);
    expect(prompt).toContain('environ 7 points');
  });

  it('instructs the intro sentence to never reuse the headline verbatim', () => {
    const prompt = buildFrenchPrompt("un texte d'article", 5);
    expect(prompt).toContain('sans jamais reprendre son titre tel quel');
  });

  it('instructs full-article coverage rather than focusing only on the opening (regression: model stopped after the first half of a long article)', () => {
    const prompt = buildFrenchPrompt("un texte d'article", 5);
    expect(prompt).toContain("qu'ils couvrent l'ensemble du texte");
    expect(prompt).toContain('plutôt que de te concentrer uniquement sur ses premières parties');
  });

  it('places the grouping instruction before the one-point-per-line/em-dash formatting instruction (order is intentional, not incidental)', () => {
    const prompt = buildFrenchPrompt("un texte d'article", 5);
    const groupingIndex = prompt.indexOf('Regroupe les idées proches sous un même point');
    const formatIndex = prompt.indexOf(
      'Rédige un point par ligne, chaque ligne commençant par un tiret cadratin'
    );
    expect(groupingIndex).toBeGreaterThanOrEqual(0);
    expect(formatIndex).toBeGreaterThan(groupingIndex);
  });

  it('sandwiches a full reminder (target point count, coverage, grouping, and format) after the article text (regression: on a long article, a cap-only reminder became the dominant instruction by recency, and the model dropped the intro/blank-line/em-dash structure)', () => {
    const articleText = "un texte d'article";
    const prompt = buildFrenchPrompt(articleText, 5);
    const articleIndex = prompt.indexOf(articleText);
    const upfrontIndex = prompt.indexOf("Lis attentivement l'article fourni ci-dessous");
    const reminderIndex = prompt.indexOf('Rappel : le texte ci-dessus peut contenir');

    expect(upfrontIndex).toBeGreaterThanOrEqual(0);
    expect(upfrontIndex).toBeLessThan(articleIndex);
    expect(reminderIndex).toBeGreaterThan(articleIndex);

    const reminder = prompt.slice(reminderIndex);
    expect(reminder).toContain("phrase d'introduction");
    expect(reminder).toContain('ligne vide');
    expect(reminder).toContain('tiret cadratin (—)');
    expect(reminder).toContain("environ 5 points qui couvrent l'article de bout en bout");
    expect(reminder).toContain('en regroupant les idées proches sous un même point');
  });

  it('instructs the model to ignore boilerplate (sharing/legal/URL) before the real article start, both upfront and in the reminder (regression: pasted text with site boilerplate before the real content caused a paraphrased-opening-sentence heading)', () => {
    const prompt = buildFrenchPrompt("un texte d'article", 5);
    expect(prompt).toContain(
      "Le texte fourni peut être précédé de mentions de partage, légales, ou d'une URL avant le début réel de l'article"
    );
    expect(prompt).toContain('Rappel : le texte ci-dessus peut contenir des mentions de partage');
    expect(prompt).toContain("jamais de titre ni de ligne d'en-tête séparée");
  });
});
