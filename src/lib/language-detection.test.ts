import { describe, expect, it } from 'vitest';
import { detectLanguage } from './language-detection';

describe('detectLanguage', () => {
  it('detects French when French-marker density is well above English-marker density', () => {
    const text =
      'Le président de la République a annoncé que les mesures pour la crise ' +
      'sont prêtes et que le gouvernement va agir dans les prochains jours.';
    expect(detectLanguage(text)).toBe('fr');
  });

  it('detects English for ordinary English text with no French markers', () => {
    const text =
      'The president announced new measures today. Officials say the plan will ' +
      'take effect next month and address the ongoing economic concerns.';
    expect(detectLanguage(text)).toBe('en');
  });

  it('detects English when the French-marker density is low relative to the English-marker density', () => {
    // 1 French marker ("de") vs 4 English markers ("the", "of", "is", "this") -> English wins.
    const text =
      'This report from the ministry of economy shows growth is slowing across ' +
      'most sectors this quarter de spite earlier forecasts remaining stable';
    expect(detectLanguage(text)).toBe('en');
  });

  it('detects French for short text where French markers clearly outweigh English markers', () => {
    // 2 French markers ("le", "du"), 0 English markers -> French wins.
    const text = 'Voici le rapport annuel complet du service concerné aujourd hui';
    expect(detectLanguage(text)).toBe('fr');
  });

  it('detects mixed French/English content as French once French-marker density exceeds English-marker density', () => {
    const text =
      'Breaking news today: le gouvernement announced que les mesures pour la crise ' +
      'sont effective dans les prochaines semaines according to officials.';
    expect(detectLanguage(text)).toBe('fr');
  });

  it('defaults to English for text with no markers from either list', () => {
    expect(detectLanguage('Xylophone jazz music rhythm')).toBe('en');
  });

  it('defaults to English for empty text', () => {
    expect(detectLanguage('')).toBe('en');
  });

  // Regression: a real manual-QA repro pasted as a single continuous block (paragraph
  // breaks lost, as commonly happens copying from a web page). A single-list,
  // French-only percentage threshold misdetected this as French, because French
  // sentences naturally pack far more stopword-list words per sentence than English
  // does — a short but grammatically normal French sentence was enough to cross 8% of
  // the *total* word count even though English was the clear majority. Comparing
  // proportional density against a matching English-marker list fixes this.
  it('detects English on a majority-English continuous block with one dense French sentence appended (regression)', () => {
    const englishParagraphs =
      'The government announced a new economic plan today, focusing on job creation ' +
      'and infrastructure investment across several regions. Officials say the plan ' +
      'will take effect next month. Business leaders welcomed the announcement, ' +
      'noting that the measures could help stabilize prices and support small ' +
      'companies struggling with rising costs. Analysts expect a gradual improvement ' +
      'in consumer confidence over the coming months. The plan also includes ' +
      'provisions for renewable energy projects, aiming to reduce dependence on ' +
      'imported fuel. Several regional governors praised the initiative as a ' +
      'long-term investment in sustainable growth. Critics, however, argue that the ' +
      'funding is insufficient given the scale of the challenges facing the country. ' +
      'They point to persistent unemployment in rural areas and call for more ' +
      'targeted support programs.';
    const denseFrenchSentence =
      'Le gouvernement, dans un communiqué, a précisé que les mesures pour la crise ' +
      "sont, selon les experts, en cours d'application dans les prochains jours.";

    expect(detectLanguage(englishParagraphs + ' ' + denseFrenchSentence)).toBe('en');
  });

  it('detects French on a majority-French continuous block with one dense English sentence appended (regression, reverse direction)', () => {
    const frenchParagraphs =
      'Les ventes ont augmenté ce trimestre dans la plupart des régions. Les clients ' +
      'ont bien réagi aux nouvelles ouvertures de magasins. Les programmes de ' +
      'formation du personnel ont nettement amélioré la qualité du service. Les ' +
      "analystes restent prudemment optimistes quant aux perspectives de l'année " +
      'prochaine.';
    const denseEnglishSentence =
      'The government, in a statement, confirmed that the measures for the crisis ' +
      'are, according to experts, being applied in the coming days.';

    expect(detectLanguage(frenchParagraphs + ' ' + denseEnglishSentence)).toBe('fr');
  });

  // Regression: "car" is both a French stopword and a common English noun. An English
  // article mentioning cars repeatedly must not skew toward French from that word
  // alone — proportional comparison against the English-marker list (which also scores
  // highly on this ordinary English text) neutralizes it.
  it('does not skew French on English text that repeatedly says "car"/"cars"', () => {
    const text =
      'The new car model launched today. Traffic reporters said the car caused ' +
      'delays as drivers lined up to see the car in person. Car sales are expected ' +
      'to rise this year across the car industry.';
    expect(detectLanguage(text)).toBe('en');
  });
});
