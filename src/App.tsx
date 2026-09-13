import { useState } from 'react';
import { PasteArea } from './components/PasteArea';
import { SummaryResult } from './components/SummaryResult';
import { generateSummary } from './lib/ollama';
import { buildEnglishPrompt, GENERATION_PARAMS } from './lib/prompts';

const UNREACHABLE_ERROR = 'Impossible de joindre le modèle local.';

function App() {
  const [articleText, setArticleText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const prompt = buildEnglishPrompt(articleText);
      const result = await generateSummary(prompt, GENERATION_PARAMS);
      setSummary(result);
    } catch {
      setError(UNREACHABLE_ERROR);
    } finally {
      setIsLoading(false);
    }
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
      <SummaryResult summary={summary} error={error} />
    </main>
  );
}

export default App;
