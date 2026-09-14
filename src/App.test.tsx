import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
      expect(screen.getByText('Detected: EN')).toBeInTheDocument();
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
      expect(screen.getByText('Detected: FR')).toBeInTheDocument();
    });
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(requestBody.prompt).toContain('Rédige uniquement en français.');
  });

  it('disables the textarea and Résumer button while streaming is in progress', async () => {
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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Résumer' })).toBeDisabled();
    });
    expect(screen.getByRole('textbox')).toBeDisabled();

    resolveBody();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Résumer' })).toBeEnabled();
    });
  });
});
