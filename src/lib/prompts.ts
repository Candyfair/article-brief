// Static prompt templates and Ollama generation parameters (CLAUDE.md: config-shaped
// content lives here, never inline in components).
//
// Two separate, hardcoded prompts — French and English — never a single bilingual
// prompt (CLAUDE.md decision #4, SPEC.md §4). Which one is used is decided by
// language-detection.ts's result; prompt-selection logic itself lives at the call site,
// not here.

export const OLLAMA_MODEL = 'mistral:7b';

export interface OllamaGenerationParams {
  temperature: number;
  num_ctx: number;
  num_predict: number;
}

// Fixed constants (SPEC.md §4) — not scaled per request.
const TEMPERATURE = 0.2;
const NUM_CTX = 8192;

// Target bullet-point count, used ONLY to interpolate into the prompt text below — do
// NOT wire this into computeNumPredict (SPEC.md §4). Roughly one point per 300 words,
// clamped between 3 and 10. The model doesn't follow this number literally (a real
// ~2900-word article produced 18 points against a "~10" target), but a comparable
// manual run with vs. without the number in the prompt suggested it works as a soft
// "there's more ground to cover" signal that delays the model's own sense that the
// list is complete — see the working hypothesis and both eval_count data points in
// SPEC.md §4. One comparable run each side at temperature 0.2 (not zero, so some
// variance is expected) — a working hypothesis, not a settled conclusion.
export function computeTargetPoints(wordCount: number): number {
  const target = Math.round(wordCount / 300);
  return Math.min(10, Math.max(3, target));
}

// num_predict, scaled directly from article word count (SPEC.md §4/§9) — independent of
// computeTargetPoints above. An earlier version keyed num_predict off the target point
// count; that coupling was dropped because the target wasn't a reliable basis for a
// generation budget (it produced a too-tight cap, eval_count 1014 against a computed
// cap of 1050 on a real ~2900-word article). This formula is derived from that same
// data point (eval_count 1014 on ~2900 words) with headroom rather than a tight fit:
// 0.45 tokens of output per word of article, plus a 150-token floor contribution,
// clamped between 500 and 1600. Still an untuned starting point, not a calibrated
// model — see SPEC.md §9.
export function computeNumPredict(wordCount: number): number {
  const predict = Math.round(wordCount * 0.45) + 150;
  return Math.min(1600, Math.max(500, predict));
}

export function buildGenerationParams(numPredict: number): OllamaGenerationParams {
  return {
    temperature: TEMPERATURE,
    num_ctx: NUM_CTX,
    num_predict: numPredict,
  };
}

// Structure contract (SPEC.md §4): one short intro sentence, a blank line, then a
// target number of bullet points each starting with an em dash ("—"). The French prompt
// is written entirely in French, no English framing mixed in (SPEC.md §4, CLAUDE.md) —
// that, not few-shot examples, is what fixed anglicisms on Newsletter Digest.
export function buildFrenchPrompt(articleText: string, targetPoints: number): string {
  return `Tu résumes des articles de presse pour un lecteur pressé.

Lis attentivement l'article fourni ci-dessous. Rédige d'abord une phrase d'introduction courte et originale qui indique de quoi parle l'article, sans jamais reprendre son titre tel quel. Le texte fourni peut être précédé de mentions de partage, légales, ou d'une URL avant le début réel de l'article : ignore ce type de contenu et repère où l'article commence réellement. Saute ensuite une ligne. Rédige enfin environ ${targetPoints} points reprenant les idées principales de l'article, en veillant à ce qu'ils couvrent l'ensemble du texte — son début, son développement et sa conclusion — plutôt que de te concentrer uniquement sur ses premières parties. Regroupe les idées proches sous un même point plutôt que d'en faire des points séparés : chaque point peut résumer plusieurs informations liées entre elles. Rédige un point par ligne, chaque ligne commençant par un tiret cadratin (—) suivi d'un espace.

Reste factuel et neutre, fondé uniquement sur le contenu de l'article. N'ajoute ni titre, ni numérotation, ni commentaire en dehors de cette structure. Ne répète pas l'introduction dans les points. Rédige uniquement en français.

Article à résumer :
"""
${articleText}
"""

Rappel : le texte ci-dessus peut contenir des mentions de partage, des mentions légales ou une URL avant le début réel de l'article — ignore-les entièrement. Respecte le format demandé : commence directement par une phrase d'introduction originale (jamais de titre ni de ligne d'en-tête séparée), puis une ligne vide, puis environ ${targetPoints} points qui couvrent l'article de bout en bout — y compris sa fin, pas seulement son début — en regroupant les idées proches sous un même point plutôt que d'en faire des points séparés, chaque point sur sa propre ligne commençant par un tiret cadratin (—).`;
}

export function buildEnglishPrompt(articleText: string, targetPoints: number): string {
  return `You summarize press articles for a reader in a hurry.

Read the article provided below carefully. First write a short, original introductory sentence stating what the article is about, never reusing its headline verbatim. The provided text may be preceded by sharing instructions, legal notices, or a URL before the article actually begins: ignore this content and locate where the article truly starts. Then leave a blank line. Finally write about ${targetPoints} points capturing the article's main ideas, making sure they cover the entire text — its beginning, development, and conclusion — rather than focusing only on its opening sections. Group related ideas under a single point instead of listing them separately: one point can summarize several connected pieces of information. Write one point per line, each line starting with an em dash (—) followed by a space.

Stay factual and neutral, based only on the article's content. Do not add a title, numbering, or commentary outside this structure. Do not repeat the introduction in the bullet points. Write only in English.

Article to summarize:
"""
${articleText}
"""

Reminder: the text above may include sharing instructions, legal notices, or a URL before the article actually begins — ignore them entirely. Follow the required format: start directly with an original introductory sentence (never a separate title or heading line), then a blank line, then about ${targetPoints} points covering the article from start to finish — including its ending, not just its beginning — grouping related ideas under a single point instead of listing them separately, each point on its own line starting with an em dash (—).`;
}
