/**
 * Async (promise) timeout
 * @param ms
 */
export function asyncTimeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
