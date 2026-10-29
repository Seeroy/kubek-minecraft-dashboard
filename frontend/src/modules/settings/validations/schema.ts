import type { ConfigSecrets } from "@shared/types/configs/mainConfig.types";
import { z } from "zod";

/**
 * FTP configuration schema
 * - If enabled is true, the port must be provided and valid
 * - FTP passwords are per account, no global one
 */
const ftpSchema = z
  .object({
    enabled: z.boolean(),
    port: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;
    if (data.port === undefined) {
      ctx.addIssue({
        path: ["port"],
        code: z.ZodIssueCode.custom,
        message: "modules.settings.validation.ftp.portRequired",
      });
    } else if (data.port < 1 || data.port > 65535) {
      ctx.addIssue({
        path: ["port"],
        code: z.ZodIssueCode.custom,
        message: "modules.settings.validation.ftp.portRange",
      });
    }
  });

/** IPv4 subnet in CIDR notation, e.g. 192.168.0.0/24 */
export const CIDR_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\/(?:3[0-2]|[12]?\d)$/;

/**
 * Subnets restriction schema
 */
export const subnetSchema = z
  .object({
    enabled: z.boolean(),
    subnets: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;
    if (!data.subnets || data.subnets.length === 0) {
      ctx.addIssue({
        path: ["subnets"],
        code: z.ZodIssueCode.custom,
        message: "modules.settings.validation.subnets.required",
      });
      return;
    }
    data.subnets.forEach((subnet, index) => {
      if (!CIDR_REGEX.test(subnet.trim())) {
        ctx.addIssue({
          path: ["subnets", index],
          code: z.ZodIssueCode.custom,
          message: "modules.settings.validation.subnets.itemInvalid",
        });
      }
    });
  });

/**
 * Telegram bot configuration schema, a blank token keeps the stored one
 */
const telegramSchema = (tokenStored: boolean) =>
  z
    .object({
      enabled: z.boolean(),
      token: z.string().optional(),
      chatIds: z.array(z.string()).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.enabled) {
        if (!tokenStored && (!data.token || data.token.trim().length === 0)) {
          ctx.addIssue({
            path: ["token"],
            code: z.ZodIssueCode.custom,
            message: "modules.settings.validation.telegram.tokenRequired",
          });
        }
      }
    });

export const telemetrySchema = z.object({
  enabled: z.boolean(),
});

export const createMainConfigSchema = (secrets?: ConfigSecrets) =>
  z.object({
    ftpd: ftpSchema,
    subnetsAccessRestriction: subnetSchema,
    telegramBot: telegramSchema(!!secrets?.["telegramBot.token"].set),
    telemetry: telemetrySchema,
    serverStats: z.object({ enabled: z.boolean() }),
    port: z
      .number({
        error: "modules.settings.validation.port.required",
      })
      .min(1, "modules.settings.validation.port.range")
      .max(65535, "modules.settings.validation.port.range"),
    // Per-user avatar nickname, saved to preferences rather than the panel config
    skinName: z.string().regex(/^[A-Za-z0-9_]{0,16}$/),
  });

export type MainConfigFormData = z.infer<ReturnType<typeof createMainConfigSchema>>;
