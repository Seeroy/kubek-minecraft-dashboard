/** Extract the token from auth header header */
export function parseBearerToken(
  header: string | undefined | null,
): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
