interface ErrorNoticeProps {
  message: string;
  hint: string;
}

// SPEC.md §2.11 error layout (desktop/mobile-06/07 mockups): a small "Échec" heading,
// the target-aware message, and a hint line — rendered between the textarea and the
// submit button/meta row (PasteArea.tsx), not appended after everything.
export function ErrorNotice({ message, hint }: ErrorNoticeProps) {
  return (
    <div className="error-notice" role="alert">
      <p className="error-label">Échec</p>
      <p className="error-message">{message}</p>
      <p className="error-hint">{hint}</p>
    </div>
  );
}
