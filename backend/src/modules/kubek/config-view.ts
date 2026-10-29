import type { FTPService, IConfiguration } from "@/core/types/config";
import { resolveSecret, secretHint } from "@/core/utils/secrets";
import type { ConfigSecrets } from "@shared/types/configs/mainConfig.types";

type SecretSection = "telegramBot";

const SECRET_FIELDS: {
  path: keyof ConfigSecrets;
  section: SecretSection;
  key: string;
}[] = [{ path: "telegramBot.token", section: "telegramBot", key: "token" }];

export const SECRET_PATHS: string[] = SECRET_FIELDS.map((field) => field.path);

// Server-side state kept in the config store, never part of this API.
// assistant and auditRetention have their own endpoints
export const INTERNAL_KEYS = [
  "twofaSetupSecret",
  "assistant",
  "auditRetention",
];

export type ConfigView = IConfiguration & { secrets: ConfigSecrets };

/** Config as returned by the API: secrets blanked and described in `secrets` */
export function toConfigView(config: IConfiguration): ConfigView {
  const view: IConfiguration = { ...config };
  for (const key of INTERNAL_KEYS) delete view[key];
  if (config.ftpd) view.ftpd = ftpSettings(config.ftpd);

  const secrets = {} as ConfigSecrets;
  for (const { path, section, key } of SECRET_FIELDS) {
    const holder = config[section] as Record<string, unknown> | undefined;
    secrets[path] = secretHint(holder?.[key] as string | undefined);
    if (holder) view[section] = { ...holder, [key]: "" } as never;
  }
  return { ...view, secrets };
}

export const isSecretPath = (path: string): path is keyof ConfigSecrets =>
  SECRET_FIELDS.some((field) => field.path === path);

/** Plain value of one secret, for an explicit reveal from the settings UI */
export function readSecret(
  config: IConfiguration,
  path: keyof ConfigSecrets,
): string | null {
  const field = SECRET_FIELDS.find((f) => f.path === path)!;
  const holder = config[field.section] as Record<string, unknown> | undefined;
  return (holder?.[field.key] as string | undefined) || null;
}

/** Incoming update with stored secrets kept wherever the client sent a blank */
export function mergeSecrets(
  current: IConfiguration,
  patch: Partial<IConfiguration>,
): Partial<IConfiguration> {
  const merged: Partial<IConfiguration> = { ...patch };
  delete merged.secrets;
  for (const key of INTERNAL_KEYS) delete merged[key];
  if (patch.ftpd) merged.ftpd = ftpSettings(patch.ftpd);

  for (const { section, key } of SECRET_FIELDS) {
    const incoming = patch[section] as Record<string, unknown> | undefined;
    if (!incoming) continue;
    const stored = (current[section] as Record<string, unknown> | undefined)?.[
      key
    ];
    merged[section] = {
      ...incoming,
      [key]: resolveSecret(stored as string | undefined, incoming[key]),
    } as never;
  }
  return merged;
}

// FTP passwords are per account now, drop the old global login
function ftpSettings(ftpd: FTPService): FTPService {
  return { enabled: !!ftpd.enabled, port: ftpd.port };
}
