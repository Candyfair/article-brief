import { useState } from 'react';
import { PasteArea } from './components/PasteArea';
import { SummaryResult } from './components/SummaryResult';
import { useStreamingSummary } from './hooks/useStreamingSummary';
import { detectLanguage, type DetectedLanguage } from './lib/language-detection';
import { buildEnglishPrompt, buildFrenchPrompt } from './lib/prompts';

function App() {
  const [articleText, setArticleText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage | null>(null);
  const { intro, introComplete, bullets, isLoading, error, start } = useStreamingSummary();

  function handleSubmit() {
    const language = detectLanguage(articleText);
    setDetectedLanguage(language);
    const prompt =
      language === 'fr' ? buildFrenchPrompt(articleText) : buildEnglishPrompt(articleText);
    void start(prompt);
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
