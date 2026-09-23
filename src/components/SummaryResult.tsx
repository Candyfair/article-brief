interface SummaryResultProps {
  intro: string;
  introComplete: boolean;
  bullets: string[];
  isLoading: boolean;
}

// Renders the streaming summary progressively (SPEC.md §2.6): the intro sentence
// composes token by token with a blinking cursor at the end of the in-progress text;
// once the intro is complete, bullets appear one by one. Error rendering lives in
// ErrorNotice instead (SPEC.md §2.11) — this component only ever shows a summary.
export function SummaryResult({ intro, introComplete, bullets, isLoading }: SummaryResultProps) {
  if (!isLoading && intro === '') {
    return null;
  }

  return (
    <div>
      <p className="summary-intro">
        {intro}
        {!introComplete && (
          <span aria-hidden="true" className="cursor">
            ▌
          </span>
        )}
      </p>
      {introComplete && bullets.length > 0 && (
        <ul className="summary-bullets">
          {bullets.map((bullet, index) => (
            <li key={index}>{bullet.replace(/^—\s*/, '')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
