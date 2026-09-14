import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryResult } from './SummaryResult';

describe('SummaryResult', () => {
  it('renders nothing in the idle state', () => {
    const { container } = render(
      <SummaryResult intro="" introComplete={false} bullets={[]} isLoading={false} error={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a blinking cursor after the in-progress intro text', () => {
    render(
      <SummaryResult
        intro="The article discusses"
        introComplete={false}
        bullets={[]}
        isLoading
        error={null}
      />
    );
    expect(screen.getByText(/The article discusses/)).toBeInTheDocument();
    expect(screen.getByText('▌')).toBeInTheDocument();
  });

  it('hides the cursor and shows bullets once the intro is complete', () => {
    render(
      <SummaryResult
        intro="The article discusses trade policy."
        introComplete
        bullets={['— first point', '— second point']}
        isLoading={false}
        error={null}
      />
    );
    expect(screen.queryByText('▌')).not.toBeInTheDocument();
    expect(screen.getByText('first point')).toBeInTheDocument();
    expect(screen.getByText('second point')).toBeInTheDocument();
  });

  it('does not show bullets still in the intro-incomplete phase, even if some were passed', () => {
    render(
      <SummaryResult
        intro="Still going"
        introComplete={false}
        bullets={['— stray']}
        isLoading
        error={null}
      />
    );
    expect(screen.queryByText(/stray/)).not.toBeInTheDocument();
  });

  it('shows the inline error message instead of the summary', () => {
    render(
      <SummaryResult
        intro="ignored"
        introComplete
        bullets={['ignored']}
        isLoading={false}
        error="Impossible de joindre le modèle local."
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de joindre le modèle local.');
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();
  });
});
