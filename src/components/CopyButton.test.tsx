import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    writeText.mockClear();
  });

  it('copies the summary text to the clipboard and shows the confirmation label', () => {
    render(<CopyButton text={'Intro.\n\n— point one'} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copier le résumé' }));

    expect(writeText).toHaveBeenCalledWith('Intro.\n\n— point one');
    expect(screen.getByRole('button', { name: 'Copié ✓' })).toBeInTheDocument();
  });

  it('reverts to the default label after the confirmation window (SPEC.md §2.9)', () => {
    render(<CopyButton text="Intro." />);

    fireEvent.click(screen.getByRole('button', { name: 'Copier le résumé' }));
    expect(screen.getByRole('button', { name: 'Copié ✓' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByRole('button', { name: 'Copier le résumé' })).toBeInTheDocument();
  });
});
