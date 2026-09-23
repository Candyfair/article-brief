import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasteArea } from './PasteArea';

const defaultProps = {
  onChange: () => {},
  onSubmit: () => {},
  isLoading: false,
  submitLabel: 'Résumer',
  selectedTarget: 'local' as const,
  onSelectTarget: () => {},
  remoteAvailable: false,
  error: null,
};

describe('PasteArea', () => {
  it('keeps "Résumer" disabled when the text area is empty', () => {
    render(<PasteArea {...defaultProps} value="" />);
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeDisabled();
  });

  it('keeps "Résumer" disabled for whitespace-only text (SPEC.md §8)', () => {
    render(<PasteArea {...defaultProps} value={'   \n  '} />);
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeDisabled();
  });

  it('enables "Résumer" once non-whitespace text is present', () => {
    render(<PasteArea {...defaultProps} value="Some article text" />);
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeEnabled();
  });

  it('disables "Résumer" while a request is in flight, even with text present', () => {
    render(<PasteArea {...defaultProps} value="Some article text" isLoading={true} />);
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeDisabled();
  });

  it('calls onSubmit when clicked while enabled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PasteArea {...defaultProps} value="Some article text" onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Résumer' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasteArea {...defaultProps} value="" onChange={onChange} />);
    await user.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('renders the button label verbatim from submitLabel (e.g. "Réessayer" after an error)', () => {
    render(<PasteArea {...defaultProps} value="Some article text" submitLabel="Réessayer" />);
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  it('shows the plain "modèle local" text, no switch, when remote is unavailable (SPEC.md §2, unchanged behavior)', () => {
    render(<PasteArea {...defaultProps} value="Some article text" remoteAvailable={false} />);
    expect(screen.getByText(/modèle local/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /modèle/ })).not.toBeInTheDocument();
  });

  it('shows the ModelSwitch when remote is available', () => {
    render(<PasteArea {...defaultProps} value="Some article text" remoteAvailable={true} />);
    expect(screen.getByRole('button', { name: /modèle local/ })).toBeInTheDocument();
  });

  it('disables the ModelSwitch while a request is in flight (SPEC.md §2)', () => {
    render(
      <PasteArea
        {...defaultProps}
        value="Some article text"
        remoteAvailable={true}
        isLoading={true}
      />
    );
    expect(screen.getByRole('button', { name: /modèle local/ })).toBeDisabled();
  });

  it('renders the ErrorNotice between the textarea and the submit button when error is set', () => {
    render(
      <PasteArea
        {...defaultProps}
        value="Some article text"
        error={{ message: 'Impossible de joindre le modèle local.', hint: "Vérifiez qu'Ollama tourne sur le Mac Mini." }}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Impossible de joindre le modèle local.');
    const textbox = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: 'Résumer' });
    // DOM order: textarea, then the error notice, then the submit button/meta row
    // (SPEC.md §2.11, desktop/mobile-06/07 mockups).
    expect(
      textbox.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      alert.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders nothing extra when error is null', () => {
    render(<PasteArea {...defaultProps} value="Some article text" error={null} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
