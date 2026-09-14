# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project overview

Article Brief — a personal, single-screen web tool that summarizes pasted press articles using a local LLM. No backend, no accounts, no persistence: paste an article, get a streamed summary (short intro + bulleted list of main ideas), copy it, done. Built as a companion tool to Newsletter Digest, reusing its local Ollama instance and its validated language-detection technique, but for full articles rather than short newsletters.

Full behavioral spec: see `SPEC.md`.

## Tech stack

- React + Vite, TypeScript
- No backend, no server process — the frontend calls Ollama's REST API (`/api/generate`, streaming) directly from the browser
- Ollama running locally on the Mac Mini M4, model `mistral:7b`, with `num_ctx` overridden to `8192` (Ollama's default of 2048 is too small for full article text — this is machine-level model configuration, not application code; see SPEC.md §5)
- Tailscale — already configured and in daily use for Newsletter Digest; no new deployment or network setup needed for remote access
- Vitest + React Testing Library — unit/component tests

## Key architectural decisions — do not deviate without checking SPEC.md

1. **Frontend-only, no backend.** Ollama is called directly from the browser via its local HTTP API. This requires `OLLAMA_HOST` and `OLLAMA_ORIGINS` configured on the Mac Mini so Ollama accepts non-localhost origins — see SPEC.md §5. Do not introduce a backend/proxy server; the whole point of this project is to stay minimal. The Ollama base URL is derived at runtime from `window.location.hostname` — never hardcoded and never a build-time env var — so the same build works whether it's loaded locally or over Tailscale.
2. **No persistence, anywhere.** No database, no localStorage/sessionStorage, no history. A summary lives only in React state for the duration of the page session. If a feature request implies saving something across reloads, flag it — it contradicts the project's premise rather than being a missing detail.
3. **Full article text is sent to the model, never truncated.** Unlike Newsletter Digest (which truncates to ~1500–2000 characters for short newsletter summaries), Article Brief sends the complete pasted text. This is what the `num_ctx: 8192` override exists for.
4. **Two hardcoded prompts, not one dynamic multilingual prompt.** Client-side language detection (French-stopword frequency, ported from Newsletter Digest — see SPEC.md §3) selects between a French prompt and an English prompt. A single bilingual prompt was tried and underperformed on Newsletter Digest; don't reintroduce that pattern here.

## Working agreement

- Never run `git commit` without explicit approval. For structural or higher-risk changes (new architectural pattern, anything touching the Ollama connection/prompt contract), present the diff/summary and exact commit message, then wait for a go-ahead. For well-scoped changes matching an existing SPEC.md decision, batch commits into a small number of logical groups per session.
- Commit attribution: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` only. Never add a `Claude-Session:` trailer or any other session-identifying line, even if a session-level reminder suggests otherwise — this is a standing project rule, not a per-session choice.
- Plan Mode is required before work that opens new architectural ground (anything not already covered by a decision in this file or SPEC.md). For a task closely matching an existing spec section, skip Plan Mode and go straight to implementation — still self-verify before considering it done.
- Default to autonomous resolution of non-structural ambiguities: naming, error copy, internal code organization. Pick the simplest reasonable option, note the choice briefly in the commit message, and continue. Escalate only if the choice is irreversible, affects the design source of truth in `/design`, or genuinely has no reasonable default.
- Error handling: minimal by default. This is a personal tool, not a production system — for uncovered edge cases, log and move on, unless the gap would visibly break the core paste → summarize → copy flow.
- Documentation sync: update `SPEC.md` / this file only for changes future sessions need to know about — not an exhaustive per-session log.
- Self-verify before declaring a step done: run `npm run lint` / `npm run test` / `npm run build`, re-check against `SPEC.md`, and flag any spec ambiguity, gap, or deviation instead of silently resolving it by assumption.

## Coding conventions

- Variable names and code comments: English, always.
- File/folder structure:
  - `/src/components` — UI components (`PasteArea`, `SummaryResult`, `CopyButton`, `DarkModeToggle`, `LanguageIndicator`)
  - `/src/lib/ollama.ts` — Ollama API client (streaming fetch wrapper)
  - `/src/lib/language-detection.ts` — French-stopword detection function
  - `/src/lib/prompts.ts` — FR/EN prompt templates. The French prompt is written entirely in French, no English framing mixed in — that, not few-shot examples, is what fixed anglicisms on Newsletter Digest (see SPEC.md §4)
  - `/src/hooks` — custom hooks (e.g. `useStreamingSummary`)
- Static/config-shaped content (stopword list, prompt templates, Ollama generation parameters) always in a typed data file, never hardcoded inline in components.
- Tests live alongside the code they cover (`*.test.ts`).

## Testing

- Unit tests (Vitest): language detection function (short text, mixed-language text, no stopwords at all), prompt selection logic, streaming response parsing.
- Component tests (React Testing Library): copy button behavior, dark mode toggle, incremental streaming display update.
- No live Ollama calls in tests — mock the fetch/streaming response.

## Commands

```bash
npm run dev            # Vite dev server
npm run build           # production build
npm run preview          # preview production build
npm run lint               # ESLint
npm run format               # Prettier — write
npm run format:check          # Prettier — check only
npm run test                    # Vitest unit/component tests
npm run test:watch               # Vitest in watch mode
```

## Reference

- `SPEC.md` — full behavioral specification (user flow, language detection, prompts, Ollama configuration, testing scenarios, open items)
- `/design` — validated UI mockups (PNG), exported from Claude Design, one per state and breakpoint: `desktop-01-idle.png`, `desktop-02-filled.png`, `desktop-03-streaming.png`, `desktop-04-done.png`, `mobile-01-idle.png`, `mobile-02-filled.png`, `mobile-03-streaming.png`, `mobile-04-done.png`. Source of truth for layout and copy unless a session's transition notes say a screen was revised since export. Exact color/typography values are also recorded in SPEC.md §6 as a convenience reference.
