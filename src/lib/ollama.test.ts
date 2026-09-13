import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { generateSummary, getOllamaBaseUrl } from './ollama';
import { GENERATION_PARAMS } from './prompts';

describe('getOllamaBaseUrl', () => {
  it('derives the base URL from window.location.hostname, never hardcoded', () => {
    expect(getOllamaBaseUrl()).toBe(`http://${window.location.hostname}:11434`);
  });
});

describe('generateSummary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls Ollama /api/generate with the dynamic hostname URL and correct params', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'A short summary.\n\n— point one\n— point two' }),
    });

    const result = await generateSummary('some prompt', GENERATION_PARAMS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(`http://${window.location.hostname}:11434/api/generate`);

    const body = JSON.parse(options.body);
    expect(body.model).toBe('mistral:7b');
    expect(body.stream).toBe(false);
    expect(body.prompt).toBe('some prompt');
    expect(body.options).toEqual({
      temperature: 0.2,
      num_ctx: 8192,
      num_predict: 1100,
    });
    // No `stop` token — removing it fixed premature truncation on Newsletter Digest (SPEC.md §4).
    expect(body.options.stop).toBeUndefined();

    expect(result).toBe('A short summary.\n\n— point one\n— point two');
  });

  it('throws when the response is not ok, so callers can surface the unreachable error', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    await expect(generateSummary('prompt', GENERATION_PARAMS)).rejects.toThrow();
  });

  it('propagates a network failure (e.g. Ollama unreachable) as a rejection', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(generateSummary('prompt', GENERATION_PARAMS)).rejects.toThrow();
  });
});
