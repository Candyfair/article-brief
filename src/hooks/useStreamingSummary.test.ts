import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStreamingSummary } from './useStreamingSummary';
import * as ollama from '../lib/ollama';
import type { ModelProfile } from '../lib/model-profiles';

const TEST_PROFILE: ModelProfile = {
  id: 'local',
  label: 'modèle local',
  model: 'llama3.1:8b',
  baseUrl: () => 'http://test-host:11434',
  generation: {},
};

const REMOTE_TEST_PROFILE: ModelProfile = {
  ...TEST_PROFILE,
  id: 'remote',
  label: 'modèle distant',
  model: 'gpt-oss:20b',
};

describe('useStreamingSummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('updates intro and bullets progressively as tokens stream in', async () => {
    vi.spyOn(ollama, 'streamSummary').mockImplementation(
      async (_profile, _prompt, _numPredict, onToken) => {
        onToken('Intro sentence.');
        onToken('\n\n');
        onToken('— first point');
        onToken('\n— second point');
      }
    );

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start(TEST_PROFILE, 'some prompt', 600);
    });

    expect(result.current.intro).toBe('Intro sentence.');
    expect(result.current.introComplete).toBe(true);
    expect(result.current.bullets).toEqual(['— first point', '— second point']);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading while streaming and clears it once done', async () => {
    let resolveStream: () => void = () => {};
    vi.spyOn(ollama, 'streamSummary').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStream = resolve;
        })
    );

    const { result } = renderHook(() => useStreamingSummary());

    act(() => {
      void result.current.start(TEST_PROFILE, 'some prompt', 600);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveStream();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces a structured, target-aware unreachable error and resets loading when the stream rejects', async () => {
    vi.spyOn(ollama, 'streamSummary').mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start(TEST_PROFILE, 'some prompt', 600);
    });

    expect(result.current.error).toEqual({ target: 'local', kind: 'unreachable' });
    expect(result.current.isLoading).toBe(false);
  });

  it('tags the error with the remote target when the remote profile fails', async () => {
    vi.spyOn(ollama, 'streamSummary').mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start(REMOTE_TEST_PROFILE, 'some prompt', 600);
    });

    expect(result.current.error).toEqual({ target: 'remote', kind: 'unreachable' });
  });

  it('surfaces an "empty" error when the stream completes but the final response is empty after trim (SPEC.md §4/§9)', async () => {
    vi.spyOn(ollama, 'streamSummary').mockImplementation(async () => {
      // Stream resolves successfully but never calls onToken with visible text — e.g.
      // the entire budget was consumed by hidden reasoning (already filtered out before
      // callers ever see it, per ollama.ts).
    });

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start(TEST_PROFILE, 'some prompt', 600);
    });

    expect(result.current.error).toEqual({ target: 'local', kind: 'empty' });
    expect(result.current.isLoading).toBe(false);
  });

  it('resets to a clean state at the start of a new run', async () => {
    vi.spyOn(ollama, 'streamSummary').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start(TEST_PROFILE, 'some prompt', 600);
    });
    expect(result.current.error).not.toBeNull();

    vi.spyOn(ollama, 'streamSummary').mockImplementationOnce(
      async (_profile, _prompt, _numPredict, onToken) => {
        onToken('New intro.');
      }
    );

    await act(async () => {
      await result.current.start(TEST_PROFILE, 'another prompt', 600);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.intro).toBe('New intro.');
  });

  it('clearError resets the error without touching loading/parsed state', async () => {
    vi.spyOn(ollama, 'streamSummary').mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start(TEST_PROFILE, 'some prompt', 600);
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
