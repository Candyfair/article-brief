import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App core loop', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pastes text, summarizes, and displays the full response once it completes', async () => {
    const user = userEvent.setup();
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Intro sentence.\n\n— idea one\n— idea two' }),
    });

    render(<App />);

    await user.type(screen.getByRole('textbox'), 'Some pasted article text');
    await user.click(screen.getByRole('button', { name: 'Résumer' }));

    await waitFor(() => {
      expect(screen.getByText(/Intro sentence/)).toBeInTheDocument();
    });
    expect(screen.getByText(/idea one/)).toBeInTheDocument();
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
});
