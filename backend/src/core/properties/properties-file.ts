import { writeFileAtomic } from "@/core/utils/atomicWrite";
import { promises as fs } from "fs";
import { PropertiesDocument } from "./properties-document";

/** Parsed file, null when it does not exist */
export async function readPropertiesFile(
  file: string,
): Promise<PropertiesDocument | null> {
  try {
    return PropertiesDocument.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Read, change and write back atomically, a missing file starts empty */
export async function updatePropertiesFile(
  file: string,
  mutate: (doc: PropertiesDocument) => void,
): Promise<PropertiesDocument> {
  const doc = (await readPropertiesFile(file)) ?? PropertiesDocument.parse("");
  mutate(doc);
  await writeFileAtomic(file, doc.toString());
  return doc;
}
