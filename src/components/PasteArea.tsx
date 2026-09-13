interface PasteAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export function PasteArea({ value, onChange, onSubmit, isLoading }: PasteAreaProps) {
  const canSubmit = value.trim() !== '' && !isLoading;

  return (
    <div>
      <textarea
        aria-label="Texte de l'article"
        placeholder="Collez l'article."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
        rows={16}
      />
      {value.trim() !== '' && <p>{wordCount(value)} mots · modèle local</p>}
      <button type="button" onClick={onSubmit} disabled={!canSubmit}>
        Résumer
      </button>
    </div>
  );
}
