import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorNotice } from './ErrorNotice';

describe('ErrorNotice', () => {
  it('renders the message and hint as an alert', () => {
    render(
      <ErrorNotice
        message="Impossible de joindre le modèle distant."
        hint="Vérifiez la connexion, ou basculez sur le modèle local."
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Impossible de joindre le modèle distant.');
    expect(alert).toHaveTextContent('Vérifiez la connexion, ou basculez sur le modèle local.');
    expect(alert).toHaveTextContent('Échec');
  });
});
