import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { ndjsonResponse, interruptedNdjsonResponse } from './test/mock-ollama-stream';

describe('App core loop', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('shows the unreachable-model error and re-enables Résumer immediately when Ollama fails', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Impossible de joindre le modèle local.');
    });
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeEnabled();
    // Pasted text is preserved so the user can retry (SPEC.md §2.11).
    expect(screen.getByRole('textbox')).toHaveValue('Some pasted article text');
  });

  it('shows the same unreachable error when the stream is interrupted mid-generation', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(interruptedNdjsonResponse(['Intro sentence.', ' still going']));

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Impossible de joindre le modèle local.');
    });
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeEnabled();
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
    // computeNumPredict(4 words) = round(4 * 0.45) + 150 = 152, clamped up to 500.
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
    // computeNumPredict(3000 words) = round(3000 * 0.45) + 150 = 1500.
    expect(requestBody.options.num_predict).toBe(1500);
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
