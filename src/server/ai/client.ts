import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

/**
 * Returns a configured Gemini language model, or null if the API key is not set.
 * Uses the Vercel AI SDK Google provider so query-engine and chat route share
 * the same generateText / streamText interface.
 */
export function getGeminiModel(): LanguageModel | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const google = createGoogleGenerativeAI({ apiKey });
  return google(DEFAULT_GEMINI_MODEL);
}
