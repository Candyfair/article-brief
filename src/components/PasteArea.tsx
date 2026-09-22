import { wordCount } from '../lib/word-count';

interface PasteAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function PasteArea({ value, onChange, onSubmit, isLoading }: PasteAreaProps) {
  const canSubmit = value.trim() !== '' && !isLoading;

  return (
    <div>
      <textarea
        className="paste-textarea"
        aria-label="Texte de l'article"
        placeholder="Collez l'article."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
        rows={10}
      />
      <div className="paste-actions">
        <button type="button" className="button-primary" onClick={onSubmit} disabled={!canSubmit}>
          Résumer
        </button>
        {value.trim() !== '' && (
          <p className="meta-label">{wordCount(value)} mots · modèle local</p>
        )}
      </div>
    </div>
  );
}
