import { useState } from 'react';
import { PasteArea } from './components/PasteArea';
import { SummaryResult } from './components/SummaryResult';
import { useStreamingSummary } from './hooks/useStreamingSummary';
import { buildEnglishPrompt } from './lib/prompts';

function App() {
  const [articleText, setArticleText] = useState('');
  const { intro, introComplete, bullets, isLoading, error, start } = useStreamingSummary();

  function handleSubmit() {
    void start(buildEnglishPrompt(articleText));
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
