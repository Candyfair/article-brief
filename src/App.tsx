import { useEffect, useState } from 'react';
import { CopyButton } from './components/CopyButton';
import { DarkModeToggle } from './components/DarkModeToggle';
import { LanguageIndicator } from './components/LanguageIndicator';
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Tracks whether the header/result view is showing (SPEC.md §2.7-8) — set on submit,
  // cleared by an explicit back-to-source click. When an error comes in, `isResultView`
  // below drops to false on its own, returning to the source view without a separate
  // step (SPEC.md §2.11: "no need to go back through the source toggle first").
  const [showResult, setShowResult] = useState(false);
  const { intro, introComplete, bullets, isLoading, error, start } = useStreamingSummary();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const isResultView = showResult && !error;
  const isDone = isResultView && !isLoading;

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
    setShowResult(true);
    void start(prompt, computeNumPredict(words));
  }

  function handleBackToSource() {
    if (!isDone) return;
    setShowResult(false);
  }

  const summaryText = bullets.length > 0 ? `${intro}\n\n${bullets.join('\n')}` : intro;

  const summaryResult = (
    <SummaryResult
      intro={intro}
      introComplete={introComplete}
      bullets={bullets}
      isLoading={isLoading}
      error={error}
    />
  );

  return (
    <div className={isResultView ? 'app app--result' : 'app'}>
      <header className="app-header">
        {isResultView ? (
          <>
            <button
              type="button"
              className="header-control"
              onClick={handleBackToSource}
              disabled={!isDone}
            >
              ↩ Source · {wordCount(articleText)} mots
            </button>
            <div className="header-controls-right">
              {detectedLanguage && <LanguageIndicator language={detectedLanguage} />}
              <DarkModeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode((dark) => !dark)} />
            </div>
          </>
        ) : (
          <>
            <h1 className="wordmark">Article Brief</h1>
            <DarkModeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode((dark) => !dark)} />
          </>
        )}
      </header>
      {isResultView && <hr className="header-rule" />}

      <main>
        {isResultView ? (
          <>
            {summaryResult}
            {isDone && intro !== '' && <CopyButton text={summaryText} />}
          </>
        ) : (
          <>
            <PasteArea
              value={articleText}
              onChange={setArticleText}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
            {/* Only the error path renders here (SPEC.md §2.11) — a completed summary
                belongs to the result view and must not linger once the user has gone
                back to source. */}
            {error && summaryResult}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
