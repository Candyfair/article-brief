import type { TargetId } from '../lib/model-profiles';

interface ModelSwitchProps {
  selected: TargetId;
  onSelect: (target: TargetId) => void;
  disabled: boolean;
}

// Minimal, unstyled local/remote toggle (SPEC.md §2; desktop/mobile-05-filled-remote
// mockups): a single button showing the CURRENT target plus a swap glyph — not a
// radiogroup — click swaps to the other target. Final styling is a later session; this
// just needs to be functional, accessible, and keyboard-operable.
export function ModelSwitch({ selected, onSelect, disabled }: ModelSwitchProps) {
  const bareLabel = selected === 'local' ? 'local' : 'distant';
  const otherBareLabel = selected === 'local' ? 'distant' : 'local';

  return (
    <button
      type="button"
      className="model-switch"
      // Accessible name must contain the visible text (WCAG 2.5.3 Label in Name) so
      // speech-input/voice-control users can target it by what they see, while also
      // naming the destination the click leads to.
      aria-label={`modèle ${bareLabel}, passer au modèle ${otherBareLabel}`}
      onClick={() => onSelect(selected === 'local' ? 'remote' : 'local')}
      disabled={disabled}
    >
      modèle {bareLabel}{' '}
      <span className="model-switch__glyph" aria-hidden="true">
        ⇄
      </span>
    </button>
  );
}
