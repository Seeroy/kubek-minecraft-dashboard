import { createHash } from "crypto";
import { createReadStream } from "fs";

export type HashAlgorithm = "sha1" | "sha512";

/** Hash a file in one streaming pass, lowercase hex per algorithm */
export async function hashFile<A extends HashAlgorithm>(
  filePath: string,
  algorithms: readonly A[],
): Promise<Record<A, string>> {
  const hashers = algorithms.map((algorithm) => createHash(algorithm));
  for await (const chunk of createReadStream(filePath)) {
    for (const hasher of hashers) hasher.update(chunk as Buffer);
  }
  const result = {} as Record<A, string>;
  algorithms.forEach((algorithm, i) => {
    result[algorithm] = hashers[i].digest("hex");
  });
  return result;
}

/** Algorithm of a hex digest by its length */
export function digestAlgorithm(hex: string): HashAlgorithm | undefined {
  if (hex.length === 128) return "sha512";
  if (hex.length === 40) return "sha1";
  return undefined;
}
