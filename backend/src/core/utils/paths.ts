import { promises as fs } from "fs";
import { dirname, isAbsolute, relative, resolve, sep } from "path";

/** target is base or inside it, by path text only */
export function isInside(base: string, target: string): boolean {
  const rel = relative(resolve(base), resolve(target));
  if (rel === "") return true;
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Same check with symlinks resolved. With allowMissing the closest existing
 * parent is checked, for paths we are about to create
 */
export async function isRealInside(
  base: string,
  target: string,
  allowMissing = false,
): Promise<boolean> {
  let realBase: string;
  try {
    realBase = await fs.realpath(base);
  } catch {
    return false;
  }

  let probe = resolve(target);
  for (;;) {
    try {
      return isInside(realBase, await fs.realpath(probe));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT" || !allowMissing) {
        return false;
      }
      // Writing through a dangling link creates its target
      if (await isSymlink(probe)) return false;
      const parent = dirname(probe);
      if (parent === probe) return false;
      probe = parent;
    }
  }
}

async function isSymlink(path: string): Promise<boolean> {
  try {
    return (await fs.lstat(path)).isSymbolicLink();
  } catch {
    return false;
  }
}
