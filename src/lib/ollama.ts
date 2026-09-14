// Ollama API client. Talks directly to the local Ollama instance from the browser —
// no backend (CLAUDE.md decision #1).
import { OLLAMA_MODEL, type OllamaGenerationParams } from './prompts';

// The base URL is derived at runtime from window.location.hostname, never hardcoded and
// never a build-time env var, so the same build works locally and over Tailscale
// (SPEC.md §5).
export function getOllamaBaseUrl(): string {
  return `http://${window.location.hostname}:11434`;
}

interface OllamaStreamChunk {
  response?: string;
  done?: boolean;
}

// Streams a summary from Ollama's /api/generate endpoint (stream: true), invoking
// onToken as each token arrives. Ollama's streaming response body is newline-delimited
// JSON — one object per line, each carrying a `response` token, with `done: true` on
// the final line.
//
// Throws if the request fails outright, if the connection drops mid-stream, or if the
// stream ends without ever sending a final `done: true` line (SPEC.md §8: interrupted
// streams surface the same "unreachable" error as a failed request).
export async function streamSummary(
  prompt: string,
  params: OllamaGenerationParams,
  onToken: (token: string) => void
): Promise<void> {
  const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: true,
      options: params,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;

  function consumeLine(line: string) {
    if (!line.trim()) return;
    const chunk = JSON.parse(line) as OllamaStreamChunk;
    if (chunk.response) onToken(chunk.response);
    if (chunk.done) sawDone = true;
  }

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) consumeLine(line);
  }

  if (buffer.trim()) consumeLine(buffer);

  if (!sawDone) {
    throw new Error('Ollama stream ended before completion.');
  }
}
