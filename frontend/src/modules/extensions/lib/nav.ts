export type ExtensionNavGroup = "main" | "server" | "admin";

// Section names extensions use for the administration group
const ADMIN_SECTIONS = new Set(["admin", "administration", "integration", "integrations", "system", "settings"]);

export function navGroupOf(section: string | undefined): ExtensionNavGroup {
  const name = section?.trim().toLowerCase();
  if (name === "server") return "server";
  if (name && ADMIN_SECTIONS.has(name)) return "admin";
  return "main";
}

/** Link to an extension page, server tabs carry their id so the page knows the contribution */
export function extensionHref(view: string, tab?: string | null): string {
  return tab ? `/ext?view=${view}&tab=${tab}` : `/ext?view=${view}`;
}
