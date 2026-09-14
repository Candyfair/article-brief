interface SummaryResultProps {
  intro: string;
  introComplete: boolean;
  bullets: string[];
  isLoading: boolean;
  error: string | null;
}

// Renders the streaming summary progressively (SPEC.md §2.6): the intro sentence
// composes token by token with a blinking cursor at the end of the in-progress text;
// once the intro is complete, bullets appear one by one.
export function SummaryResult({
  intro,
  introComplete,
  bullets,
  isLoading,
  error,
}: SummaryResultProps) {
  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!isLoading && intro === '') {
    return null;
  }

  return (
    <div>
      <style>{`
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .cursor {
          animation: cursor-blink 1s step-end infinite;
        }
      `}</style>
      <p>
        {intro}
        {!introComplete && (
          <span aria-hidden="true" className="cursor">
            ▌
          </span>
        )}
      </p>
      {introComplete && bullets.length > 0 && (
        <ul>
          {bullets.map((bullet, index) => (
            <li key={index}>{bullet.replace(/^—\s*/, '')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
