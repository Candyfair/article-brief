import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelSwitch } from './ModelSwitch';

describe('ModelSwitch', () => {
  it('shows the current target label when local is selected', () => {
    render(<ModelSwitch selected="local" onSelect={() => {}} disabled={false} />);
    expect(screen.getByRole('button')).toHaveTextContent('modèle local');
  });

  it('shows the current target label when remote is selected', () => {
    render(<ModelSwitch selected="remote" onSelect={() => {}} disabled={false} />);
    expect(screen.getByRole('button')).toHaveTextContent('modèle distant');
  });

  it('fires onSelect with the other target when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ModelSwitch selected="local" onSelect={onSelect} disabled={false} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('remote');
  });

  it('fires onSelect with local when remote is currently selected', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ModelSwitch selected="remote" onSelect={onSelect} disabled={false} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('local');
  });

  it('is disabled and does not fire onSelect when disabled', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ModelSwitch selected="local" onSelect={onSelect} disabled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('accessible name contains the visible label text (WCAG 2.5.3) and names the destination', () => {
    render(<ModelSwitch selected="local" onSelect={() => {}} disabled={false} />);
    expect(screen.getByRole('button')).toHaveAccessibleName(
      'modèle local, passer au modèle distant'
    );
  });
});
