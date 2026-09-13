import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasteArea } from './PasteArea';

describe('PasteArea', () => {
  it('keeps "Résumer" disabled when the text area is empty', () => {
    render(<PasteArea value="" onChange={() => {}} onSubmit={() => {}} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeDisabled();
  });

  it('keeps "Résumer" disabled for whitespace-only text (SPEC.md §8)', () => {
    render(
      <PasteArea value={'   \n  '} onChange={() => {}} onSubmit={() => {}} isLoading={false} />
    );
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeDisabled();
  });

  it('enables "Résumer" once non-whitespace text is present', () => {
    render(
      <PasteArea
        value="Some article text"
        onChange={() => {}}
        onSubmit={() => {}}
        isLoading={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeEnabled();
  });

  it('disables "Résumer" while a request is in flight, even with text present', () => {
    render(
      <PasteArea
        value="Some article text"
        onChange={() => {}}
        onSubmit={() => {}}
        isLoading={true}
      />
    );
    expect(screen.getByRole('button', { name: 'Résumer' })).toBeDisabled();
  });

  it('calls onSubmit when clicked while enabled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <PasteArea
        value="Some article text"
        onChange={() => {}}
        onSubmit={onSubmit}
        isLoading={false}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Résumer' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasteArea value="" onChange={onChange} onSubmit={() => {}} isLoading={false} />);
    await user.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
