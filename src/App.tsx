import { useEffect, useState } from 'react';
import { CopyButton } from './components/CopyButton';
import { DarkModeToggle } from './components/DarkModeToggle';
import { LanguageIndicator } from './components/LanguageIndicator';
import { PasteArea } from './components/PasteArea';
import { SummaryResult } from './components/SummaryResult';
import { useStreamingSummary } from './hooks/useStreamingSummary';
import { detectLanguage, type DetectedLanguage } from './lib/language-detection';
import {
  LOCAL_PROFILE,
  REMOTE_PROFILE,
  buildErrorHint,
  buildErrorMessage,
  getAvailableProfiles,
  type TargetId,
} from './lib/model-profiles';
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
  // Never persisted (CLAUDE.md decision #2) — every page load starts on local.
  const [selectedTarget, setSelectedTarget] = useState<TargetId>('local');
  // Tracks whether the header/result view is showing (SPEC.md §2.7-8) — set on submit,
  // cleared by an explicit back-to-source click. When an error comes in, `isResultView`
  // below drops to false on its own, returning to the source view without a separate
  // step (SPEC.md §2.11: "no need to go back through the source toggle first").
  const [showResult, setShowResult] = useState(false);
  const { intro, introComplete, bullets, isLoading, error, start, clearError } =
    useStreamingSummary();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const isResultView = showResult && !error;
  const isDone = isResultView && !isLoading;
  const remoteAvailable = getAvailableProfiles().some((profile) => profile.id === 'remote');
  const activeProfile = selectedTarget === 'remote' ? REMOTE_PROFILE : LOCAL_PROFILE;

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
    void start(activeProfile, prompt, computeNumPredict(words));
  }

  function handleBackToSource() {
    if (!isDone) return;
    setShowResult(false);
  }

  // Any change of target or to the text clears a standing error and resets the label
  // back to "Résumer" (SPEC.md §2.11) — permanently, until the next error: nothing
  // remembers which target failed, so switching back to it later does not restore
  // "Réessayer". showResult must drop alongside the error, or isResultView (which only
  // depends on showResult && !error) would snap back to a stale result panel the
  // instant the error clears.
  function handleTargetChange(next: TargetId) {
    if (next === selectedTarget) return;
    if (error) {
      clearError();
      setShowResult(false);
    }
    setSelectedTarget(next);
  }

  function handleTextChange(next: string) {
    if (error) {
      clearError();
      setShowResult(false);
    }
    setArticleText(next);
  }

  const summaryText = bullets.length > 0 ? `${intro}\n\n${bullets.join('\n')}` : intro;
  const submitLabel = error ? 'Réessayer' : 'Résumer';
  const pasteAreaError = error
    ? {
        message: buildErrorMessage(error.target, error.kind),
        hint: buildErrorHint(
          error.target,
          error.kind,
          error.target === 'local' ? remoteAvailable : true
        ),
      }
    : null;

  const summaryResult = (
    <SummaryResult
      intro={intro}
      introComplete={introComplete}
      bullets={bullets}
      isLoading={isLoading}
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
              {selectedTarget === 'remote' ? ' · modèle distant' : ''}
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
          <PasteArea
            value={articleText}
            onChange={handleTextChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel={submitLabel}
            selectedTarget={selectedTarget}
            onSelectTarget={handleTargetChange}
            remoteAvailable={remoteAvailable}
            error={pasteAreaError}
          />
        )}
      </main>
    </div>
  );
}

export default App;
