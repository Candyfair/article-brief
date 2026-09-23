import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import {
  ndjsonResponse,
  interruptedNdjsonResponse,
  emptyFinalResponseNdjson,
} from './test/mock-ollama-stream';

describe('App core loop', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('pastes text, streams the summary progressively, and shows the full result once done', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(
      ndjsonResponse(['Intro sentence.', '\n\n', '— idea one', '\n', '— idea two'])
    );

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByText(/Intro sentence/)).toBeInTheDocument();
    });
    expect(screen.getByText(/idea one/)).toBeInTheDocument();
    expect(screen.getByText(/idea two/)).toBeInTheDocument();
  });

  it('shows the unreachable-model error, reads "Réessayer", and preserves the pasted text', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Impossible de joindre le modèle local.');
    });
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeEnabled();
    // Pasted text is preserved so the user can retry (SPEC.md §2.11).
    expect(screen.getByRole('textbox')).toHaveValue('Some pasted article text');
  });

  it('shows the same unreachable error, reading "Réessayer", when the stream is interrupted mid-generation', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(interruptedNdjsonResponse(['Intro sentence.', ' still going']));

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Impossible de joindre le modèle local.');
    });
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeEnabled();
  });

  it('degrades gracefully on malformed output missing the blank-line/dash structure (SPEC.md §8)', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Just a wall of text with no structure at all.']));

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Just a wall of text with no structure at all\./)
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('detects English text, shows the EN indicator, and sends the English prompt', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Intro sentence.']));

    render(<App />);

    await user.type(
      screen.getByRole('textbox'),
      'The president announced new measures today to address economic concerns.'
    );
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByText('EN détecté')).toBeInTheDocument();
    });
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(requestBody.prompt).toContain('Write only in English.');
  });

  it('detects French text, shows the FR indicator, and sends the French prompt', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Phrase d’intro.']));

    render(<App />);

    await user.type(
      screen.getByRole('textbox'),
      'Le président de la République a annoncé que les mesures pour la crise ' +
        'sont prêtes et que le gouvernement va agir dans les prochains jours.'
    );
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByText('FR détecté')).toBeInTheDocument();
    });
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(requestBody.prompt).toContain('Rédige uniquement en français.');
  });

  it('strips a standalone URL line from the request prompt while keeping it in the textarea (SPEC.md §2)', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Intro sentence.']));

    render(<App />);

    const pastedText =
      'Share this article.\nhttps://example.com/share-this-article\n' +
      'The actual article content starts here and continues for a while.';
    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: pastedText } });
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(requestBody.prompt).not.toContain('https://example.com/share-this-article');
    expect(requestBody.prompt).toContain(
      'The actual article content starts here and continues for a while.'
    );
    // Back-to-source / textarea state is untouched — the user still sees exactly what
    // they pasted, URL line included (SPEC.md §2.8).
    expect(textbox).toHaveValue(pastedText);
  });

  it('uses the clamped minimum target point count and num_predict for a short article (SPEC.md §4)', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Intro sentence.']));

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'A short pasted article.');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    // computeTargetPoints(4 words) = round(4 / 300) = 0, clamped up to 3.
    expect(requestBody.prompt).toContain('about 3 points');
    // computeNumPredict(4 words) = round(4 * 0.65) + 350 = 353, clamped up to 500.
    // LOCAL_PROFILE has no reasoningAllowance, so num_predict is exactly that.
    expect(requestBody.options.num_predict).toBe(500);
  });

  it('scales the target point count and num_predict up for a long article (SPEC.md §4)', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Intro sentence.']));

    render(<App />);

    const longArticle = 'word '.repeat(3000).trim();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: longArticle } });
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    // computeTargetPoints(3000 words) = round(3000 / 300) = 10, the clamp ceiling.
    expect(requestBody.prompt).toContain('about 10 points');
    // computeNumPredict(3000 words) = round(3000 * 0.65) + 350 = 2300, clamped down to 2200.
    expect(requestBody.options.num_predict).toBe(2200);
  });

  it('swaps to the result view on submit, keeping back-to-source inert until generation completes (SPEC.md §2.7-8, §8)', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    let resolveBody: () => void = () => {};
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              resolveBody = () => {
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({ response: 'Intro.', done: false }) + '\n'
                  )
                );
                controller.enqueue(
                  new TextEncoder().encode(JSON.stringify({ response: '', done: true }) + '\n')
                );
                controller.close();
              };
            },
          });
          resolve({ ok: true, body });
        })
    );

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    const backToSource = await screen.findByRole('button', { name: /Source/ });
    expect(backToSource).toBeDisabled();
    // The paste area is replaced by the result view during generation, not just disabled.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    resolveBody();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Source/ })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /Source/ }));
    expect(screen.getByRole('textbox')).toHaveValue('Some pasted article text');
  });
});

describe('local/remote target switch (SPEC.md §2, desktop/mobile-05 mockups)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows the plain "modèle local" label, no switch, when the remote env var is unset', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');

    expect(screen.getByText(/modèle local/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /modèle/ })).not.toBeInTheDocument();
  });

  it('shows the switch, defaulting to local, once the remote env var is set', async () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', 'http://fake-remote-host:11434');
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');

    expect(screen.getByRole('button', { name: /modèle local/ })).toBeInTheDocument();
  });

  it('sends the request to the remote base URL and model once switched to remote', async () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', 'http://fake-remote-host:11434');
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Intro sentence.']));

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: /modèle local/ }));
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://fake-remote-host:11434/api/generate');
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe('gpt-oss:20b');
  });
});

describe('error / retry state machine (SPEC.md §2.11)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('retrying after an error resubmits with the same pasted text', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    mockFetch.mockResolvedValueOnce(ndjsonResponse(['Intro sentence.']));

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    const retryButton = await screen.findByRole('button', { name: 'Réessayer' });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Intro sentence/)).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    expect(secondBody.prompt).toContain('Some pasted article text');
  });

  it('changing the target after an error clears it and resets the label, without resubmitting', async () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', 'http://fake-remote-host:11434');
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));
    await screen.findByRole('button', { name: 'Réessayer' });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /modèle local/ }));

    expect(screen.getByRole('button', { name: 'Résumer' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // No automatic retry — changing target alone must not fire a new request.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('editing the text after an error clears it and resets the label', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));
    await screen.findByRole('button', { name: 'Réessayer' });

    await user.type(screen.getByRole('textbox'), '!');

    expect(screen.getByRole('button', { name: 'Résumer' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('switching back to the target that failed does not restore "Réessayer"', async () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', 'http://fake-remote-host:11434');
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));
    await screen.findByRole('button', { name: 'Réessayer' });

    // local (failed) -> remote (clears error) -> back to local (still no restore).
    await user.click(screen.getByRole('button', { name: /modèle local/ }));
    await user.click(screen.getByRole('button', { name: /modèle distant/ }));

    expect(screen.getByRole('button', { name: 'Résumer' })).toBeInTheDocument();
  });

  it('shows the target-aware "no response" message and "Réessayer" when the stream completes but is empty (SPEC.md §4/§9)', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(emptyFinalResponseNdjson(['thinking a lot...']));

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Le modèle local n'a pas produit de réponse."
      );
    });
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeEnabled();
  });
});

describe('header target segment (SPEC.md §2, desktop/mobile-08 mockups)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows "modèle distant" in the header while streaming and after completion, only when remote is active', async () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', 'http://fake-remote-host:11434');
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    let resolveBody: () => void = () => {};
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              resolveBody = () => {
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({ response: 'Intro.', done: false }) + '\n'
                  )
                );
                controller.enqueue(
                  new TextEncoder().encode(JSON.stringify({ response: '', done: true }) + '\n')
                );
                controller.close();
              };
            },
          });
          resolve({ ok: true, body });
        })
    );

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: /modèle local/ }));
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    const backToSource = await screen.findByRole('button', { name: /Source/ });
    expect(backToSource).toHaveTextContent('modèle distant');

    resolveBody();
    await waitFor(() => expect(backToSource).toBeEnabled());
    expect(backToSource).toHaveTextContent('modèle distant');
  });

  it('shows no target segment in the header when local is active', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(ndjsonResponse(['Intro sentence.']));

    render(<App />);
    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    const backToSource = await screen.findByRole('button', { name: /Source/ });
    expect(backToSource).not.toHaveTextContent('modèle distant');
  });
});
