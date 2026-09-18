import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStreamingSummary } from './useStreamingSummary';
import * as ollama from '../lib/ollama';

describe('useStreamingSummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('updates intro and bullets progressively as tokens stream in', async () => {
    vi.spyOn(ollama, 'streamSummary').mockImplementation(async (_prompt, _params, onToken) => {
      onToken('Intro sentence.');
      onToken('\n\n');
      onToken('— first point');
      onToken('\n— second point');
    });

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start('some prompt', 600);
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
      void result.current.start('some prompt', 600);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveStream();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces the unreachable error and resets loading when the stream rejects', async () => {
    vi.spyOn(ollama, 'streamSummary').mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start('some prompt', 600);
    });

    expect(result.current.error).toBe('Impossible de joindre le modèle local.');
    expect(result.current.isLoading).toBe(false);
  });

  it('resets to a clean state at the start of a new run', async () => {
    vi.spyOn(ollama, 'streamSummary').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useStreamingSummary());

    await act(async () => {
      await result.current.start('some prompt', 600);
    });
    expect(result.current.error).not.toBeNull();

    vi.spyOn(ollama, 'streamSummary').mockImplementationOnce(async (_prompt, _params, onToken) => {
      onToken('New intro.');
    });

    await act(async () => {
      await result.current.start('another prompt', 600);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.intro).toBe('New intro.');
  });
});
