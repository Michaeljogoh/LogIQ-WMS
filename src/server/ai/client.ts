import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

export function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Anthropic({ apiKey });
}

/** @deprecated Use getAnthropic */
export function createAiClient(): Anthropic | null {
  return getAnthropic();
}
