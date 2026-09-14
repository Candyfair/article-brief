import { useCallback, useState } from 'react';
import { streamSummary } from '../lib/ollama';
import { GENERATION_PARAMS } from '../lib/prompts';
import { parseStreamingSummary, type ParsedSummary } from '../lib/streaming-parser';

const UNREACHABLE_ERROR = 'Impossible de joindre le modèle local.';

const IDLE_STATE: ParsedSummary = { intro: '', introComplete: false, bullets: [] };

interface UseStreamingSummaryResult extends ParsedSummary {
  isLoading: boolean;
  error: string | null;
  start: (prompt: string) => Promise<void>;
}

// Drives a streaming Ollama generation and exposes it as incrementally-parsed React
// state (SPEC.md §2.6): the intro composes token by token, bullets appear once each is
// complete.
export function useStreamingSummary(): UseStreamingSummaryResult {
  const [parsed, setParsed] = useState<ParsedSummary>(IDLE_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setParsed(IDLE_STATE);

    let rawText = '';
    try {
      await streamSummary(prompt, GENERATION_PARAMS, (token) => {
        rawText += token;
        setParsed(parseStreamingSummary(rawText, false));
      });
      setParsed(parseStreamingSummary(rawText, true));
    } catch {
      setError(UNREACHABLE_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { ...parsed, isLoading, error, start };
}
