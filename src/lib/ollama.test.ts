import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { streamSummary, getOllamaBaseUrl } from './ollama';
import type { ModelProfile } from './model-profiles';
import {
  ndjsonResponse,
  interruptedNdjsonResponse,
  ndjsonResponseWithThinking,
} from '../test/mock-ollama-stream';

const TEST_PROFILE: ModelProfile = {
  id: 'local',
  label: 'modèle local',
  model: 'llama3.1:8b',
  baseUrl: () => 'http://test-host:11434',
  generation: {},
};

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

  it("calls Ollama /api/generate with stream: true and the given profile's model/base URL", async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['A short summary.']));

    await streamSummary(TEST_PROFILE, 'some prompt', 600, () => {});

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://test-host:11434/api/generate');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('llama3.1:8b');
    expect(body.stream).toBe(true);
    expect(body.prompt).toBe('some prompt');
    expect(body.options).toEqual({
      temperature: 0.2,
      num_ctx: 8192,
      num_predict: 600,
    });
  });

  it("applies the profile's generation overrides (reasoningAllowance/numCtx) to the request options", async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['A short summary.']));

    const remoteProfile: ModelProfile = {
      ...TEST_PROFILE,
      id: 'remote',
      model: 'gpt-oss:20b',
      generation: { reasoningAllowance: 1500, numCtx: 10240 },
    };
    await streamSummary(remoteProfile, 'some prompt', 600, () => {});

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-oss:20b');
    expect(body.options).toEqual({
      temperature: 0.2,
      num_ctx: 10240,
      num_predict: 2100,
    });
  });

  it('invokes onToken incrementally as each token arrives, not just once at the end', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(
      ndjsonResponse(['Intro.', '\n\n', '— point one', '\n', '— point two'])
    );

    const received: string[] = [];
    await streamSummary(TEST_PROFILE, 'prompt', 600, (token) => received.push(token));

    expect(received).toEqual(['Intro.', '\n\n', '— point one', '\n', '— point two']);
  });

  it('never forwards thinking chunks to onToken — only response chunks reach the caller (SPEC.md §4)', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(
      ndjsonResponseWithThinking(['reasoning about the article...'], ['Intro.', ' done.'])
    );

    const received: string[] = [];
    await streamSummary(TEST_PROFILE, 'prompt', 600, (token) => received.push(token));

    expect(received).toEqual(['Intro.', ' done.']);
    expect(received.join('')).not.toContain('reasoning about the article');
  });

  it('logs done_reason and a reasoning-length indicator alongside the existing token counts (SPEC.md §9)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponseWithThinking(['abcde'], ['Intro.']));

    await streamSummary(TEST_PROFILE, 'prompt', 600, () => {});

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('done_reason: stop'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reasoning_chars: 5'));
    consoleSpy.mockRestore();
  });

  it('throws when the response is not ok, so callers can surface the unreachable error', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: false, status: 500, body: null });

    await expect(streamSummary(TEST_PROFILE, 'prompt', 600, () => {})).rejects.toThrow();
  });

  it('propagates a network failure (e.g. Ollama unreachable) as a rejection', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(streamSummary(TEST_PROFILE, 'prompt', 600, () => {})).rejects.toThrow();
  });

  it('throws if the stream is interrupted mid-generation, before a final done:true line', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(interruptedNdjsonResponse(['Intro.', ' more text']));

    await expect(streamSummary(TEST_PROFILE, 'prompt', 600, () => {})).rejects.toThrow();
  });

  it('throws when the profile has no available base URL (e.g. remote target unconfigured)', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    const unavailableProfile: ModelProfile = { ...TEST_PROFILE, baseUrl: () => null };

    await expect(streamSummary(unavailableProfile, 'prompt', 600, () => {})).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
