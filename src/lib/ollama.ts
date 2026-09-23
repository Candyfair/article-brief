// Ollama API client. Talks directly to the Ollama instance from the browser — no
// backend (CLAUDE.md decision #1).
import { buildGenerationParams } from './prompts';
import type { ModelProfile } from './model-profiles';

// The local target's base URL is derived at runtime from window.location.hostname,
// never hardcoded and never a build-time env var, so the same build works locally and
// over Tailscale (SPEC.md §5). The remote target's resolution is a build-time env var
// instead — a narrow, explicit exception (model-profiles.ts, SPEC.md §5).
export function getOllamaBaseUrl(): string {
  return `http://${window.location.hostname}:11434`;
}

interface OllamaStreamChunk {
  response?: string;
  thinking?: string;
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

// Streams a summary from Ollama's /api/generate endpoint (stream: true) for the given
// profile, invoking onToken as each response token arrives. Ollama's streaming response
// body is newline-delimited JSON — one object per line, each carrying a `response`
// token, with `done: true` on the final line. A "thinking" model (the remote gpt-oss:20b
// profile) may also emit a separate `thinking` field on some lines: that hidden
// reasoning text is never forwarded to onToken, never displayed, never copied, never
// counted as output (SPEC.md §4) — only `response` ever reaches the caller.
//
// Throws if the profile has no available base URL, if the request fails outright, if
// the connection drops mid-stream, or if the stream ends without ever sending a final
// `done: true` line (SPEC.md §8: interrupted streams surface the same "unreachable"
// error as a failed request).
export async function streamSummary(
  profile: ModelProfile,
  prompt: string,
  numPredict: number,
  onToken: (token: string) => void
): Promise<void> {
  const baseUrl = profile.baseUrl();
  if (!baseUrl) {
    throw new Error(`No base URL available for the "${profile.id}" profile.`);
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: profile.model,
      prompt,
      stream: true,
      options: buildGenerationParams(profile, numPredict),
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;
  let reasoningChars = 0;

  function consumeLine(line: string) {
    if (!line.trim()) return;
    const chunk = JSON.parse(line) as OllamaStreamChunk;
    if (chunk.thinking) reasoningChars += chunk.thinking.length;
    if (chunk.response) onToken(chunk.response);
    if (chunk.done) {
      sawDone = true;
      // Dev diagnostic for tuning num_predict/reasoningAllowance against real articles
      // (SPEC.md §9) — no logging library needed for a personal tool. reasoning_chars is
      // a character count, not a token count — only thinking.length is available
      // without re-tokenizing, but it's enough of a qualitative signal to recalibrate
      // the remote profile's reasoningAllowance from real usage over time.
      console.log(
        `Ollama token counts — prompt_eval_count: ${chunk.prompt_eval_count}, eval_count: ${chunk.eval_count}, done_reason: ${chunk.done_reason}, reasoning_chars: ${reasoningChars}`
      );
    }
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
