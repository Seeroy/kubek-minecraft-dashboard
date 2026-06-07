import type {
  Capability,
  KubekExtensionManifest,
} from "@kubekpanel/extension-sdk";
import { Injectable } from "@nestjs/common";
import semver from "semver";

// kept in sync with the panel version; extensions declare engines.kubek against this
const KUBEK_VERSION = "4.0.0";

const ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

const KNOWN_CAPABILITIES: Capability[] = [
  "events:server",
  "events:logs",
  "events:tasks",
  "events:backups",
  "events:players",
  "events:auth",
  "events:files",
  "servers:read",
  "servers:control",
  "http:routes",
  "http:outbound",
  "storage",
  "settings",
  "commands",
  "tasks",
];

/** Static manifest checks run before an extension is installed or activated */
@Injectable()
export class ExtensionValidator {
  /** Returns a list of problems; empty means the manifest is valid */
  validate(manifest: KubekExtensionManifest): string[] {
    const errors: string[] = [];

    if (manifest?.manifestVersion !== 1) {
      errors.push("manifestVersion must be 1");
    }
    if (!manifest?.id || !ID_PATTERN.test(manifest.id)) {
      errors.push("id must be reverse-domain (e.g. com.author.name)");
    }
    if (!manifest?.name) errors.push("name is required");
    if (!manifest?.version || !semver.valid(manifest.version)) {
      errors.push("version must be valid semver");
    }
    if (!manifest?.engines?.kubek) {
      errors.push("engines.kubek is required");
    } else if (!semver.satisfies(KUBEK_VERSION, manifest.engines.kubek)) {
      errors.push(
        `engines.kubek ${manifest.engines.kubek} not satisfied by ${KUBEK_VERSION}`,
      );
    }

    for (const cap of manifest?.permissions?.requires ?? []) {
      if (!KNOWN_CAPABILITIES.includes(cap))
        errors.push(`unknown capability "${cap}"`);
    }

    if (!manifest?.backend && !manifest?.frontend) {
      errors.push("extension must declare a backend or frontend entry");
    }

    // File icons must be .png
    if (
      manifest?.icon &&
      /\.[a-z0-9]+$/i.test(manifest.icon) &&
      !/\.png$/i.test(manifest.icon)
    ) {
      errors.push(`icon must be a .png file (got "${manifest.icon}")`);
    }

    return errors;
  }
}
