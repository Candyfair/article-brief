// Static prompt templates and Ollama generation parameters (CLAUDE.md: config-shaped
// content lives here, never inline in components).
//
// Session 1 scope: English prompt only. The French prompt and language-detection-based
// selection between the two are added once language detection lands (see CLAUDE.md
// decision #4 and SPEC.md §3-4).

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
// bullet points each starting with an em dash ("—").
export function buildEnglishPrompt(articleText: string): string {
  return `You are a professional news summarizer. Read the article below and write a summary with exactly this structure:

1. One short introductory sentence stating what the article is about.
2. A blank line.
3. Between 3 and 6 bullet points capturing the article's main ideas. Each bullet point must start with an em dash ("—") at the beginning of its line.

Do not use any other format (no JSON, no headings, no numbering). Output only the summary, nothing else.

Article:
"""
${articleText}
"""`;
}
