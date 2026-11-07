// O Drizzle embrulha o erro do Postgres em `cause`.
type PostgresError = { code?: string; constraint_name?: string };

function postgresError(error: unknown): PostgresError | undefined {
  if (error && typeof error === "object") {
    const cause = (error as { cause?: unknown }).cause;
    return (cause && typeof cause === "object" ? cause : error) as PostgresError;
  }
}

// Violação de unicidade (código 23505) numa constraint/índice específico.
export function isUniqueViolation(error: unknown, constraint: string) {
  const pg = postgresError(error);
  return pg?.code === "23505" && pg.constraint_name === constraint;
}
