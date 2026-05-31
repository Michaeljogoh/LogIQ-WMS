/** Cookie used when a platform admin impersonates / supports a tenant account. */
export const PLATFORM_ACTIVE_ACCOUNT_COOKIE = "logiq_active_account_id";

export function parseActiveAccountIdFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${PLATFORM_ACTIVE_ACCOUNT_COOKIE}=`)) {
      const value = part.slice(PLATFORM_ACTIVE_ACCOUNT_COOKIE.length + 1);
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}
