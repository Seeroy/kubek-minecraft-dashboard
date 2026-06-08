/**
 * Hybrid fix descriptors per recognized error type
 */
export type DiagnosticFix =
  | { type: "navigate"; labelKey: string; href: string }
  | { type: "restart"; labelKey: string };

const FIXES: Record<string, DiagnosticFix[]> = {
  out_of_memory: [
    {
      type: "navigate",
      labelKey: "fixes.openServerSettings",
      href: "/server-settings",
    },
  ],
  port_bind_failed: [
    {
      type: "navigate",
      labelKey: "fixes.openServerSettings",
      href: "/server-settings",
    },
  ],
  java_version_incompatible: [
    {
      type: "navigate",
      labelKey: "fixes.openServerSettings",
      href: "/server-settings",
    },
    { type: "navigate", labelKey: "fixes.openJava", href: "/java" },
  ],
  world_corruption: [
    { type: "navigate", labelKey: "fixes.openBackups", href: "/backups" },
    { type: "navigate", labelKey: "fixes.openFiles", href: "/files" },
  ],
  plugin_error: [
    { type: "navigate", labelKey: "fixes.openPlugins", href: "/plugins" },
  ],
  configuration_error: [
    {
      type: "navigate",
      labelKey: "fixes.openServerSettings",
      href: "/server-settings",
    },
    { type: "navigate", labelKey: "fixes.openFiles", href: "/files" },
  ],
  mod_conflict: [
    { type: "navigate", labelKey: "fixes.openFiles", href: "/files" },
  ],
  disk_space: [
    { type: "navigate", labelKey: "fixes.openFiles", href: "/files" },
  ],
  file_permission_error: [
    { type: "navigate", labelKey: "fixes.openFiles", href: "/files" },
  ],
  server_unresponsive: [{ type: "restart", labelKey: "fixes.restart" }],
};

export function getDiagnosticFixes(errorType: string): DiagnosticFix[] {
  return FIXES[errorType] ?? [];
}
