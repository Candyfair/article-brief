interface ClearButtonProps {
  onClear: () => void;
}

// Discreet control to empty the pasted text in one click (SPEC.md §2 — session 7
// addition, no mockup in /design). Shown next to the "Article Brief" title whenever the
// text area is non-empty; the visible icon stays small while a padding/negative-margin
// pair (index.css) grows the hit area without shifting the header layout.
// Icon: Lucide "rotate-ccw" (ISC license), https://lucide.dev
export function ClearButton({ onClear }: ClearButtonProps) {
  return (
    <button
      type="button"
      className="clear-button"
      onClick={onClear}
      aria-label="Effacer le texte"
      title="Effacer le texte"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  );
}
