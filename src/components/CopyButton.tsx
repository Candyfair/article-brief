import { useState } from 'react';

interface CopyButtonProps {
  text: string;
}

// ~1.6s confirmation window (SPEC.md §2.9), plain setTimeout — nothing persists across
// this, or across reloads (CLAUDE.md decision #2).
const CONFIRMATION_DURATION_MS = 1600;

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleClick() {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), CONFIRMATION_DURATION_MS);
  }

  return (
    <button type="button" className="button-secondary" onClick={handleClick}>
      {copied ? 'Copié ✓' : 'Copier le résumé'}
    </button>
  );
}
