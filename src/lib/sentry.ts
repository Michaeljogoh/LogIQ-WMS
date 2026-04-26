/**
 * Sentry helpers — wire `@sentry/nextjs` when monitoring module is configured.
 */
export function captureException(
  _error: unknown,
  _context?: Record<string, unknown>,
): void {
  // no-op placeholder
}
