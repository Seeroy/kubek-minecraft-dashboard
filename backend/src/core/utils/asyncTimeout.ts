/**
 * Asynchronous timeout (in ms)
 * @param ms
 */
export async function asyncTimeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
