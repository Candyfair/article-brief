// Ollama API client. Talks directly to the local Ollama instance from the browser —
// no backend (CLAUDE.md decision #1).
import { OLLAMA_MODEL, type OllamaGenerationParams } from './prompts';

// The base URL is derived at runtime from window.location.hostname, never hardcoded and
// never a build-time env var, so the same build works locally and over Tailscale
// (SPEC.md §5).
export function getOllamaBaseUrl(): string {
  return `http://${window.location.hostname}:11434`;
}

// Session 1 scope: non-streaming call (stream: false) to validate connectivity, CORS,
// and num_ctx first. Switched to the streaming endpoint in session 2.
export async function generateSummary(
  prompt: string,
  params: OllamaGenerationParams
): Promise<string> {
  const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { response: string };
  return data.response;
}
