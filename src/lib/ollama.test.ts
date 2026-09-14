import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { streamSummary, getOllamaBaseUrl } from './ollama';
import { GENERATION_PARAMS } from './prompts';
import { ndjsonResponse, interruptedNdjsonResponse } from '../test/mock-ollama-stream';

describe('getOllamaBaseUrl', () => {
  it('derives the base URL from window.location.hostname, never hardcoded', () => {
    expect(getOllamaBaseUrl()).toBe(`http://${window.location.hostname}:11434`);
  });
});

describe('streamSummary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls Ollama /api/generate with stream: true and the correct params', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['A short summary.']));

    await streamSummary('some prompt', GENERATION_PARAMS, () => {});

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(`http://${window.location.hostname}:11434/api/generate`);

    const body = JSON.parse(options.body);
    expect(body.model).toBe('mistral:7b');
    expect(body.stream).toBe(true);
    expect(body.prompt).toBe('some prompt');
    expect(body.options).toEqual({
      temperature: 0.2,
      num_ctx: 8192,
      num_predict: 1100,
    });
  });

  it('invokes onToken incrementally as each token arrives, not just once at the end', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(
      ndjsonResponse(['Intro.', '\n\n', '— point one', '\n', '— point two'])
    );

    const received: string[] = [];
    await streamSummary('prompt', GENERATION_PARAMS, (token) => received.push(token));

    expect(received).toEqual(['Intro.', '\n\n', '— point one', '\n', '— point two']);
  });

  it('throws when the response is not ok, so callers can surface the unreachable error', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: false, status: 500, body: null });

    await expect(streamSummary('prompt', GENERATION_PARAMS, () => {})).rejects.toThrow();
  });

  it('propagates a network failure (e.g. Ollama unreachable) as a rejection', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(streamSummary('prompt', GENERATION_PARAMS, () => {})).rejects.toThrow();
  });

  it('throws if the stream is interrupted mid-generation, before a final done:true line', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(interruptedNdjsonResponse(['Intro.', ' more text']));

    await expect(streamSummary('prompt', GENERATION_PARAMS, () => {})).rejects.toThrow();
  });
});
