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

// SPEC.md §4: temperature 0.2, no stop token, num_ctx 8192, num_predict ~1000-1200
// (starting value, to be re-tuned against real articles per SPEC.md §9).
export const GENERATION_PARAMS: OllamaGenerationParams = {
  temperature: 0.2,
  num_ctx: 8192,
  num_predict: 1100,
};

// Structure contract (SPEC.md §4): one short intro sentence, a blank line, then 3-6
// bullet points each starting with an em dash ("—"). The French prompt is written
// entirely in French, no English framing mixed in (SPEC.md §4, CLAUDE.md) — that, not
// few-shot examples, is what fixed anglicisms on Newsletter Digest.
export function buildFrenchPrompt(articleText: string): string {
  return `Tu résumes des articles de presse pour un lecteur pressé.

Lis attentivement l'article fourni ci-dessous. Rédige d'abord une phrase d'introduction courte qui indique de quoi parle l'article. Saute ensuite une ligne. Rédige enfin entre 3 et 6 points reprenant les idées principales de l'article : un point par ligne, chaque ligne commençant par un tiret cadratin (—) suivi d'un espace.

Reste factuel et neutre, fondé uniquement sur le contenu de l'article. N'ajoute ni titre, ni numérotation, ni commentaire en dehors de cette structure. Ne répète pas l'introduction dans les points. Rédige uniquement en français.

Article à résumer :
"""
${articleText}
"""`;
}

export function buildEnglishPrompt(articleText: string): string {
  return `You summarize press articles for a reader in a hurry.

Read the article provided below carefully. First write a short introductory sentence stating what the article is about. Then leave a blank line. Finally write between 3 and 6 bullet points capturing the article's main ideas: one point per line, each line starting with an em dash (—) followed by a space.

Stay factual and neutral, based only on the article's content. Do not add a title, numbering, or commentary outside this structure. Do not repeat the introduction in the bullet points. Write only in English.

Article to summarize:
"""
${articleText}
"""`;
}
