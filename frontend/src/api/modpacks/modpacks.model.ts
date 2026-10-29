export type { InstallModpackProps, ModpackPreview, ModpackWarning } from "@shared/types/modpack.types";
export { ModpackErrorCode } from "@shared/types/modpack.types";

export type ModpackSearchParams = {
  query?: string;
  limit?: number;
  offset?: number;
  gameVersion?: string;
  index?: "relevance" | "downloads" | "follows" | "newest" | "updated";
};
