import { useState } from 'react';
import { PasteArea } from './components/PasteArea';
import { SummaryResult } from './components/SummaryResult';
import { useStreamingSummary } from './hooks/useStreamingSummary';
import { detectLanguage, type DetectedLanguage } from './lib/language-detection';
import {
  buildEnglishPrompt,
  buildFrenchPrompt,
  computeNumPredict,
  computeTargetPoints,
} from './lib/prompts';
import { stripBareUrlLines } from './lib/text-cleanup';
import { wordCount } from './lib/word-count';

function App() {
  const [articleText, setArticleText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage | null>(null);
  const { intro, introComplete, bullets, isLoading, error, start } = useStreamingSummary();

  function handleSubmit() {
    // Cleanup applies only to this copy, used for detection/generation — never to the
    // textarea's own state, the "back to source" content, or the word count (SPEC.md §2).
    const cleanedText = stripBareUrlLines(articleText);
    const language = detectLanguage(cleanedText);
    setDetectedLanguage(language);
    // Both computeTargetPoints (prompt text) and computeNumPredict (generation budget)
    // are independent functions of the same word count — not chained through each
    // other (SPEC.md §4): the point target doesn't reliably predict actual output
    // length, so it must not drive the budget.
    const words = wordCount(cleanedText);
    const targetPoints = computeTargetPoints(words);
    const prompt =
      language === 'fr'
        ? buildFrenchPrompt(cleanedText, targetPoints)
        : buildEnglishPrompt(cleanedText, targetPoints);
    void start(prompt, computeNumPredict(words));
  }

  return (
    <main>
      <h1>Article Brief</h1>
      <PasteArea
        value={articleText}
        onChange={setArticleText}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
      {detectedLanguage && (
        // Temporary plain-text placeholder (session 3) — styled "FR/EN détecté" badge
        // per the validated mockups is session 4's job (SPEC.md §2.4, §6).
        <p>Detected: {detectedLanguage.toUpperCase()}</p>
      )}
      <SummaryResult
        intro={intro}
        introComplete={introComplete}
        bullets={bullets}
        isLoading={isLoading}
        error={error}
      />
    </main>
  );
}

export default App;
