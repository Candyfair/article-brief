interface SummaryResultProps {
  summary: string | null;
  error: string | null;
}

// Session 1 scope: displays the full raw model response once generation completes.
// Structured parsing (intro sentence + dash bullets, SPEC.md §4) and incremental
// streaming display arrive in session 2.
export function SummaryResult({ summary, error }: SummaryResultProps) {
  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!summary) {
    return null;
  }

  return <pre>{summary}</pre>;
}
