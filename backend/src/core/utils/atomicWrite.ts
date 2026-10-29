import { randomBytes } from "crypto";
import { promises as fs } from "fs";

/** Write through a sibling temp file so readers never see a half-written file */
export async function writeFileAtomic(
  file: string,
  data: string,
): Promise<void> {
  const temp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    await fs.writeFile(temp, data);
    await fs.rename(temp, file);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
}
