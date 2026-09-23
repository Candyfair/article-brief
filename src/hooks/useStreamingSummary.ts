import { useCallback, useState } from 'react';
import { streamSummary } from '../lib/ollama';
import type { ErrorKind, ModelProfile, TargetId } from '../lib/model-profiles';
import { parseStreamingSummary, type ParsedSummary } from '../lib/streaming-parser';

const IDLE_STATE: ParsedSummary = { intro: '', introComplete: false, bullets: [] };

export interface StreamError {
  target: TargetId;
  kind: ErrorKind;
}

interface UseStreamingSummaryResult extends ParsedSummary {
  isLoading: boolean;
  error: StreamError | null;
  start: (profile: ModelProfile, prompt: string, numPredict: number) => Promise<void>;
  clearError: () => void;
}

// Drives a streaming Ollama generation and exposes it as incrementally-parsed React
// state (SPEC.md §2.6): the intro composes token by token, bullets appear once each is
// complete. numPredict is computed by the caller from the article's word count
// (computeNumPredict, SPEC.md §4) — deliberately independent of the target point count,
// not a fixed value.
//
// error is structured (target + kind) rather than a pre-formatted string, so the caller
// can derive a message and a target-aware "switch target" hint at render time (SPEC.md
// §2.11) — the hint depends on which target is currently available, which this hook
// doesn't know about.
export function useStreamingSummary(): UseStreamingSummaryResult {
  const [parsed, setParsed] = useState<ParsedSummary>(IDLE_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<StreamError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const start = useCallback(async (profile: ModelProfile, prompt: string, numPredict: number) => {
    setIsLoading(true);
    setError(null);
    setParsed(IDLE_STATE);

    let rawText = '';
    try {
      await streamSummary(profile, prompt, numPredict, (token) => {
        rawText += token;
        setParsed(parseStreamingSummary(rawText, false));
      });
      // Stream completed normally, but if the entire budget was consumed by hidden
      // reasoning (thinking is already filtered out before onToken ever sees it — see
      // ollama.ts), rawText stays empty: a distinct, target-aware error (SPEC.md §4/§9),
      // not the same as an unreachable/interrupted stream.
      if (rawText.trim() === '') {
        setError({ target: profile.id, kind: 'empty' });
      } else {
        setParsed(parseStreamingSummary(rawText, true));
      }
    } catch {
      setError({ target: profile.id, kind: 'unreachable' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { ...parsed, isLoading, error, start, clearError };
}
