/**
 * Extracts a JSON object from model output (handles optional ```json fences).
 */
export function parseJsonObject<T>(text: string): T {
  let s = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence?.[1]) {
    s = fence[1].trim();
  }
  return JSON.parse(s) as T;
}
