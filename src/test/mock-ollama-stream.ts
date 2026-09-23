// Test helper shared by ollama.test.ts, useStreamingSummary.test.ts and App.test.tsx:
// builds a mock fetch Response whose body is a ReadableStream emitting Ollama's
// newline-delimited-JSON streaming format.

export function ndjsonResponse(tokens: string[]): { ok: true; body: ReadableStream<Uint8Array> } {
  const encoder = new TextEncoder();
  const lines = [
    ...tokens.map((token) => JSON.stringify({ response: token, done: false })),
    JSON.stringify({ response: '', done: true }),
  ];

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });

  return { ok: true, body };
}

// A stream that ends abruptly without ever sending a final `done: true` line —
// simulates a network drop mid-generation (SPEC.md §8).
export function interruptedNdjsonResponse(tokens: string[]): {
  ok: true;
  body: ReadableStream<Uint8Array>;
} {
  const encoder = new TextEncoder();
  const lines = tokens.map((token) => JSON.stringify({ response: token, done: false }));

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });

  return { ok: true, body };
}

// A stream where some lines carry a `thinking` field (a "thinking" model's hidden
// reasoning, e.g. the remote gpt-oss:20b profile) ahead of the `response` tokens —
// confirms callers only ever see `response` (SPEC.md §4). Shape matches what was
// observed live against the real remote host.
export function ndjsonResponseWithThinking(
  thinkingChunks: string[],
  responseTokens: string[]
): { ok: true; body: ReadableStream<Uint8Array> } {
  const encoder = new TextEncoder();
  const lines = [
    ...thinkingChunks.map((thinking) => JSON.stringify({ thinking, done: false })),
    ...responseTokens.map((token) => JSON.stringify({ response: token, done: false })),
    JSON.stringify({ response: '', done: true, done_reason: 'stop' }),
  ];

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });

  return { ok: true, body };
}

// A stream that completes normally (done: true) but whose entire generation budget was
// consumed by hidden reasoning, leaving the final response empty — the exact shape
// observed in the live experiment against the real remote host (SPEC.md §4/§9:
// num_predict caps thinking + response combined, done_reason: "length").
export function emptyFinalResponseNdjson(thinkingChunks: string[]): {
  ok: true;
  body: ReadableStream<Uint8Array>;
} {
  const encoder = new TextEncoder();
  const lines = [
    ...thinkingChunks.map((thinking) => JSON.stringify({ thinking, done: false })),
    JSON.stringify({ response: '', done: true, done_reason: 'length' }),
  ];

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'));
      }
      controller.close();
    },
  });

  return { ok: true, body };
}
