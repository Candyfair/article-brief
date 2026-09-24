import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClearButton } from './ClearButton';

describe('ClearButton', () => {
  it('is labelled for assistive tech', () => {
    render(<ClearButton onClear={() => {}} />);
    expect(screen.getByRole('button', { name: 'Effacer le texte' })).toBeInTheDocument();
  });

  it('fires onClear when clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ClearButton onClear={onClear} />);

    await user.click(screen.getByRole('button', { name: 'Effacer le texte' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
