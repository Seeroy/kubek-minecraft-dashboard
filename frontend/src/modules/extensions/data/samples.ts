import type { InstalledExtension } from "@/shared/types/extensions.types";

const extension = (i: number, name: string): InstalledExtension => ({
  id: `sample.ext-${i}`,
  version: "1.2.0",
  enabled: true,
  manifest: {
    manifestVersion: 1,
    id: `sample.ext-${i}`,
    name,
    version: "1.2.0",
    description: "Sends server events to a chat channel",
    author: { name: "sample-author" },
    engines: { kubek: ">=4.0.0" },
    permissions: { requires: ["events:server"] },
  },
  grantedCapabilities: ["events:server"],
  status: "active",
  installedAt: 0,
  active: true,
});

export const SAMPLE_EXTENSIONS: InstalledExtension[] = [extension(1, "Discord bridge"), extension(2, "Server stats")];
