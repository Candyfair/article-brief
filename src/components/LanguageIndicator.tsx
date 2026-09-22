import type { DetectedLanguage } from '../lib/language-detection';

interface LanguageIndicatorProps {
  language: DetectedLanguage;
}

// Reflects the client-side detection result (SPEC.md §3) once it's available — the
// caller only renders this once a language has been detected (SPEC.md §2.4).
export function LanguageIndicator({ language }: LanguageIndicatorProps) {
  return (
    <span className="header-control language-indicator">
      {language === 'fr' ? 'FR détecté' : 'EN détecté'}
    </span>
  );
}
