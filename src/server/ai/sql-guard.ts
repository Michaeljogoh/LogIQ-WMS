import { TRPCError } from "@trpc/server";

const FORBIDDEN_TOKENS =
  /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|COPY|EXECUTE|INTO\s+OUTFILE|PG_SLEEP|LO_|SET\s+ROLE)\b/i;

/**
 * Validates model-generated SQL before execution (defense in depth).
 */
export function assertTenantScopedSelect(
  sql: string,
  accountId: string,
): string {
  const trimmed = sql.trim();
  if (!/^select\b/i.test(trimmed)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only SELECT queries are allowed.",
    });
  }
  if (FORBIDDEN_TOKENS.test(trimmed)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Query contains forbidden keywords.",
    });
  }
  const compact = trimmed.replace(/\s+/g, " ");
  if (
    !compact.includes(`"${accountId}"`) &&
    !compact.includes(`'${accountId}'`)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Query must filter by this account id.",
    });
  }
  return trimmed;
}
