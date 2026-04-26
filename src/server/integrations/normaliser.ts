/**
 * Normalise external platform payloads to internal DTOs.
 */
export function normaliseWebhookPayload(
  _platform: string,
  _body: unknown,
): unknown {
  throw new Error("normaliseWebhookPayload is not implemented");
}
