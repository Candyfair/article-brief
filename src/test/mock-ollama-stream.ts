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
