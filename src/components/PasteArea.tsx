import { ErrorNotice } from './ErrorNotice';
import { ModelSwitch } from './ModelSwitch';
import type { TargetId } from '../lib/model-profiles';
import { wordCount } from '../lib/word-count';

interface PasteAreaError {
  message: string;
  hint: string;
}

interface PasteAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
  selectedTarget: TargetId;
  onSelectTarget: (target: TargetId) => void;
  remoteAvailable: boolean;
  error: PasteAreaError | null;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export function PasteArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  submitLabel,
  selectedTarget,
  onSelectTarget,
  remoteAvailable,
  error,
  textareaRef,
}: PasteAreaProps) {
  const canSubmit = value.trim() !== '' && !isLoading;

  return (
    <div>
      <textarea
        ref={textareaRef}
        className="paste-textarea"
        aria-label="Texte de l'article"
        placeholder="Collez l'article."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
        rows={10}
      />
      {error && <ErrorNotice message={error.message} hint={error.hint} />}
      <div className="paste-actions">
        <button type="button" className="button-primary" onClick={onSubmit} disabled={!canSubmit}>
          {submitLabel}
        </button>
        {value.trim() !== '' && (
          <p className="meta-label">
            {wordCount(value)} mots ·{' '}
            {remoteAvailable ? (
              <ModelSwitch
                selected={selectedTarget}
                onSelect={onSelectTarget}
                disabled={isLoading}
              />
            ) : (
              'modèle local'
            )}
          </p>
        )}
      </div>
    </div>
  );
}
