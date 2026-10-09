import 'server-only';

/** All Gemini settings come from server-side environment variables. */
export function geminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || null;
  return {
    apiKey,
    // Recognition uses Flash: noticeably better than Flash-Lite at naming dishes and judging portions.
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    // Recipe ideas are simple text — the lighter, cheaper model is plenty.
    recipeModel: process.env.GEMINI_RECIPE_MODEL?.trim() || 'gemini-2.5-flash-lite',
    apiBase: (process.env.GEMINI_API_BASE?.trim() || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, ''),
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) > 0 ? Number(process.env.GEMINI_TIMEOUT_MS) : 20_000,
    thinkingBudget: process.env.GEMINI_THINKING_BUDGET !== undefined && process.env.GEMINI_THINKING_BUDGET !== '' ? Number(process.env.GEMINI_THINKING_BUDGET) : null,
  };
}
