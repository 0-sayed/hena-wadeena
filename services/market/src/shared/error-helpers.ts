/** Checks whether a caught error is a PostgreSQL unique-constraint violation (23505). */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === '23505'
  );
}

/** Checks whether a caught error is a PostgreSQL foreign-key violation (23503). */
export function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === '23503'
  );
}
