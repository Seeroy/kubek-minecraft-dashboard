import { ASSISTANT_ATTACHMENT_LIMITS, type AssistantAttachmentInput } from "@shared/types/assistant.types";

/** A file picked in the composer, ready to send */
export interface DraftAttachment extends AssistantAttachmentInput {
  key: string;
  /** Local preview of an image */
  previewUrl?: string;
}

export type AttachmentError = "unsupported" | "tooLarge" | "binary";

export class AttachmentReadError extends Error {
  constructor(
    readonly reason: AttachmentError,
    readonly fileName: string
  ) {
    super(reason);
  }
}

// Server configs and logs, the usual things to ask about
const TEXT_EXTENSIONS = [
  "txt", "log", "json", "jsonc", "yml", "yaml", "xml", "properties", "toml", "cfg", "conf", "ini", "md", "csv", "env",
  "sk", "mcmeta", "lang", "sh", "bat", "cmd", "ps1", "js", "ts", "java", "kt", "py", "lua", "sql", "html", "css",
];
const TEXT_NAME = new RegExp(`\\.(${TEXT_EXTENSIONS.join("|")})$`, "i");
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
// Providers scale big images down anyway, smaller uploads save tokens and time
const MAX_IMAGE_SIDE = 1600;

export const isImageFile = (file: File) => IMAGE_TYPES.has(file.type);
const isTextFile = (file: File) => file.type.startsWith("text/") || TEXT_NAME.test(file.name);

/** accept attribute of the file picker, images only when the model can see them */
export const fileAccept = (vision: boolean) =>
  [...(vision ? IMAGE_TYPES : []), "text/*", ...TEXT_EXTENSIONS.map((ext) => `.${ext}`)].join(",");

/** Reads a picked file into what the API takes, images are downscaled first */
export async function readAttachment(file: File): Promise<DraftAttachment> {
  const key = `${file.name}:${file.size}:${file.lastModified}:${Math.random()}`;
  if (isImageFile(file)) {
    const blob = await downscale(file);
    const data = await toBase64(blob);
    if (data.length > ASSISTANT_ATTACHMENT_LIMITS.imageChars) throw new AttachmentReadError("tooLarge", file.name);
    return { key, kind: "image", name: file.name, mime: blob.type, data, previewUrl: URL.createObjectURL(blob) };
  }
  if (!isTextFile(file)) throw new AttachmentReadError("unsupported", file.name);
  const text = await file.text();
  if (text.includes("\u0000")) throw new AttachmentReadError("binary", file.name);
  if (text.length > ASSISTANT_ATTACHMENT_LIMITS.textChars) throw new AttachmentReadError("tooLarge", file.name);
  return { key, kind: "text", name: file.name, mime: "text/plain", data: text };
}

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  // Small images go as they are, re-encoding would only lose quality
  if (scale === 1 && file.size < 1_000_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  // Browsers without a WebP encoder hand back PNG, which the server accepts too
  return blob && IMAGE_TYPES.has(blob.type) ? blob : file;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
