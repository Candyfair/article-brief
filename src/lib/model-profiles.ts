// Per-target Ollama profiles (SPEC.md §4/§5). The local and remote targets differ in
// base URL resolution, model, and generation overrides; buildGenerationParams
// (prompts.ts) takes the active profile into account, while computeTargetPoints/
// computeNumPredict stay profile-independent (SPEC.md §4). Target selection is always a
// manual, explicit user choice, never automatic (SPEC.md §2) — this module only defines
// what each target is, not which one is active.
import { getOllamaBaseUrl } from './ollama';

export type TargetId = 'local' | 'remote';

export interface GenerationOverrides {
  // Added on top of computeNumPredict's own budget. gpt-oss:20b's hidden "thinking"
  // tokens share the same num_predict budget as the visible response — confirmed by a
  // live experiment against the remote host (SPEC.md §4/§9) — so the remote profile
  // needs extra headroom beyond what an ordinary article length would otherwise budget.
  reasoningAllowance?: number;
  // Overrides the default num_ctx (8192) when set.
  numCtx?: number;
}

export interface ModelProfile {
  id: TargetId;
  label: string;
  model: string;
  // A function, not a plain string: the local target resolves from
  // window.location.hostname at call time, and the remote target's env var must be read
  // lazily too (see REMOTE_PROFILE below) rather than captured once at module load.
  baseUrl: () => string | null;
  generation: GenerationOverrides;
}

export const LOCAL_PROFILE: ModelProfile = {
  id: 'local',
  label: 'modèle local',
  model: 'llama3.1:8b',
  baseUrl: getOllamaBaseUrl,
  generation: {},
};

export const REMOTE_PROFILE: ModelProfile = {
  id: 'remote',
  label: 'modèle distant',
  model: 'gpt-oss:20b',
  // Build-time config, remote target only — a narrow exception to CLAUDE.md decision #1
  // (SPEC.md §5); the local target above stays runtime-resolved. Read lazily inside the
  // function (never captured as a module-level constant) so tests can stub it per-case
  // with vi.stubEnv and so an unset var correctly yields "remote unavailable" rather
  // than a frozen value from whenever this module first loaded.
  baseUrl: () => import.meta.env.VITE_REMOTE_OLLAMA_HOST ?? null,
  generation: {
    // Both provisional first-cut values derived from a live experiment against the
    // actual remote host, not guessed — see SPEC.md §4/§9 for the full derivation and
    // the console logging (ollama.ts) that recalibrates them from real usage over time.
    reasoningAllowance: 1500,
    numCtx: 10240,
  },
};

// Local is always available; remote only appears once VITE_REMOTE_OLLAMA_HOST is set
// (SPEC.md §2) — this is what makes the switch itself disappear, falling back to the
// plain "modèle local" label, when the env var is unset.
export function getAvailableProfiles(): ModelProfile[] {
  return [LOCAL_PROFILE, ...(REMOTE_PROFILE.baseUrl() ? [REMOTE_PROFILE] : [])];
}

export type ErrorKind = 'unreachable' | 'empty';

// SPEC.md §2.11 error contract — one message per target/kind combination.
export function buildErrorMessage(target: TargetId, kind: ErrorKind): string {
  const label = target === 'local' ? 'local' : 'distant';
  return kind === 'unreachable'
    ? `Impossible de joindre le modèle ${label}.`
    : `Le modèle ${label} n'a pas produit de réponse.`;
}

// Hint line shown under the error message. otherAvailable controls whether the
// "switch target" clause is offered — remote failing always offers local (always
// available); local failing only offers remote when it's configured. Always ends with a
// period, whether or not the switch clause is present.
export function buildErrorHint(target: TargetId, kind: ErrorKind, otherAvailable: boolean): string {
  const otherLabel = target === 'local' ? 'distant' : 'local';
  const switchClause = otherAvailable ? `, ou basculez sur le modèle ${otherLabel}` : '';
  if (kind === 'unreachable') {
    const base =
      target === 'local' ? "Vérifiez qu'Ollama tourne sur le Mac Mini" : 'Vérifiez la connexion';
    return `${base}${switchClause}.`;
  }
  return `Relancez${switchClause}.`;
}
