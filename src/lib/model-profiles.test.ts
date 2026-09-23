import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LOCAL_PROFILE,
  REMOTE_PROFILE,
  getAvailableProfiles,
  buildErrorMessage,
  buildErrorHint,
} from './model-profiles';

describe('LOCAL_PROFILE', () => {
  it('resolves its base URL at runtime from window.location.hostname', () => {
    expect(LOCAL_PROFILE.baseUrl()).toBe(`http://${window.location.hostname}:11434`);
  });

  it('uses the llama3.1:8b model with no generation overrides', () => {
    expect(LOCAL_PROFILE.model).toBe('llama3.1:8b');
    expect(LOCAL_PROFILE.generation).toEqual({});
  });
});

describe('REMOTE_PROFILE', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves its base URL from VITE_REMOTE_OLLAMA_HOST', () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', 'http://example-remote-host:11434');
    expect(REMOTE_PROFILE.baseUrl()).toBe('http://example-remote-host:11434');
  });

  it('returns null when the env var is unset, regardless of the developer machine state', () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', undefined);
    expect(REMOTE_PROFILE.baseUrl()).toBeNull();
  });

  it('uses the gpt-oss:20b model with a reasoningAllowance and a raised numCtx (SPEC.md §4)', () => {
    expect(REMOTE_PROFILE.model).toBe('gpt-oss:20b');
    expect(REMOTE_PROFILE.generation).toEqual({ reasoningAllowance: 1500, numCtx: 10240 });
  });
});

describe('getAvailableProfiles', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('includes only local when the remote env var is unset (SPEC.md §2: no switch shown)', () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', undefined);
    expect(getAvailableProfiles().map((p) => p.id)).toEqual(['local']);
  });

  it('includes both when the remote env var is set', () => {
    vi.stubEnv('VITE_REMOTE_OLLAMA_HOST', 'http://example-remote-host:11434');
    expect(getAvailableProfiles().map((p) => p.id)).toEqual(['local', 'remote']);
  });
});

describe('buildErrorMessage', () => {
  it('builds the unreachable message per target', () => {
    expect(buildErrorMessage('local', 'unreachable')).toBe('Impossible de joindre le modèle local.');
    expect(buildErrorMessage('remote', 'unreachable')).toBe('Impossible de joindre le modèle distant.');
  });

  it('builds the empty-response message per target', () => {
    expect(buildErrorMessage('local', 'empty')).toBe("Le modèle local n'a pas produit de réponse.");
    expect(buildErrorMessage('remote', 'empty')).toBe("Le modèle distant n'a pas produit de réponse.");
  });
});

describe('buildErrorHint', () => {
  it('offers to switch to local when remote fails and local is available (mockup-confirmed copy)', () => {
    expect(buildErrorHint('remote', 'unreachable', true)).toBe(
      'Vérifiez la connexion, ou basculez sur le modèle local.'
    );
    expect(buildErrorHint('remote', 'empty', true)).toBe('Relancez, ou basculez sur le modèle local.');
  });

  it('offers to switch to remote when local fails and remote is available', () => {
    expect(buildErrorHint('local', 'unreachable', true)).toBe(
      "Vérifiez qu'Ollama tourne sur le Mac Mini, ou basculez sur le modèle distant."
    );
    expect(buildErrorHint('local', 'empty', true)).toBe(
      'Relancez, ou basculez sur le modèle distant.'
    );
  });

  it('omits the switch clause but still ends with a period when the other target is unavailable', () => {
    expect(buildErrorHint('local', 'unreachable', false)).toBe(
      "Vérifiez qu'Ollama tourne sur le Mac Mini."
    );
    expect(buildErrorHint('local', 'empty', false)).toBe('Relancez.');
  });
});
