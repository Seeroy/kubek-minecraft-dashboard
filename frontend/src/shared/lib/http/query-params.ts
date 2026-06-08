type QueryParamPrimitive = string | number | boolean;

/** A value accepted by {@link buildQueryString} */
export type QueryParamValue =
  | QueryParamPrimitive
  | QueryParamPrimitive[]
  | null
  | undefined;

/**
 * Build a URL query string from a typed params object
 */
export function buildQueryString(
  params: Record<string, QueryParamValue>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(
      key,
      Array.isArray(value) ? JSON.stringify(value) : String(value)
    );
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
