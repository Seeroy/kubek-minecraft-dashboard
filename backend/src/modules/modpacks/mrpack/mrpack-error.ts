import type { ModpackErrorCode } from "@shared/types/modpack.types";

/** Pack validation failure, mapped to a 400 with the code by the service */
export class MrpackError extends Error {
  constructor(
    readonly code: ModpackErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MrpackError";
  }
}
