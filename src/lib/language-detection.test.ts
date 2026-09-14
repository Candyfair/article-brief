import { describe, expect, it } from 'vitest';
import { detectLanguage } from './language-detection';

describe('detectLanguage', () => {
  it('detects French when stopword frequency is well above the 8% threshold', () => {
    const text =
      'Le président de la République a annoncé que les mesures pour la crise ' +
      'sont prêtes et que le gouvernement va agir dans les prochains jours.';
    expect(detectLanguage(text)).toBe('fr');
  });

  it('detects English for ordinary English text with no French stopwords', () => {
    const text =
      'The president announced new measures today. Officials say the plan will ' +
      'take effect next month and address the ongoing economic concerns.';
    expect(detectLanguage(text)).toBe('en');
  });

  it('detects English for short text that falls just under the 8% threshold', () => {
    // 22 words, 1 French stopword ("de") -> ~4.5%, below the 8% threshold.
    const text =
      'This report from the ministry of economy shows growth is slowing across ' +
      'most sectors this quarter de spite earlier forecasts remaining stable';
    expect(detectLanguage(text)).toBe('en');
  });

  it('detects French for short text that clears the 8% threshold', () => {
    // 10 words, 2 French stopwords ("le", "du") -> 20%, above the 8% threshold.
    const text = 'Voici le rapport annuel complet du service concerné aujourd hui';
    expect(detectLanguage(text)).toBe('fr');
  });

  it('detects mixed French/English content as French once stopwords exceed 8%', () => {
    const text =
      'Breaking news today: le gouvernement announced que les mesures pour la crise ' +
      'sont effective dans les prochaines semaines according to officials.';
    expect(detectLanguage(text)).toBe('fr');
  });

  it('defaults to English for text with no stopwords at all', () => {
    expect(detectLanguage('Xylophone jazz music rhythm')).toBe('en');
  });

  it('defaults to English for empty text', () => {
    expect(detectLanguage('')).toBe('en');
  });
});
