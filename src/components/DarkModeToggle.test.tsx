import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DarkModeToggle } from './DarkModeToggle';

describe('DarkModeToggle', () => {
  it('shows "Sombre" in light mode', () => {
    render(<DarkModeToggle isDark={false} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sombre' })).toBeInTheDocument();
  });

  it('shows "Clair" in dark mode', () => {
    render(<DarkModeToggle isDark onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Clair' })).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<DarkModeToggle isDark={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
