import { z } from "zod";

/**
 * FTP configuration schema
 * - If enabled is true, all fields must be provided and valid
 */
export const ftpSchema = z
  .object({
    enabled: z.boolean(),
    username: z.string().optional(),
    password: z.string().optional(),
    port: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enabled) {
      if (!data.username || data.username.trim().length === 0) {
        ctx.addIssue({
          path: ["username"],
          code: z.ZodIssueCode.custom,
          message: "modules.settings.validation.ftp.usernameRequired",
        });
      }
      if (!data.password || data.password.trim().length === 0) {
        ctx.addIssue({
          path: ["password"],
          code: z.ZodIssueCode.custom,
          message: "modules.settings.validation.ftp.passwordRequired",
        });
      }
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
    }
  });

/** IPv4 subnet in CIDR notation, e.g. 192.168.0.0/24 */
const CIDR_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\/(?:3[0-2]|[12]?\d)$/;

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
      const value = subnet.trim();
      if (value.length === 0) {
        ctx.addIssue({
          path: ["subnets", index],
          code: z.ZodIssueCode.custom,
          message: "modules.settings.validation.subnets.itemRequired",
        });
      } else if (!CIDR_REGEX.test(value)) {
        ctx.addIssue({
          path: ["subnets", index],
          code: z.ZodIssueCode.custom,
          message: "modules.settings.validation.subnets.itemInvalid",
        });
      }
    });
  });

/**
 * Telegram bot configuration schema
 */
export const telegramSchema = z
  .object({
    enabled: z.boolean(),
    token: z.string().optional(),
    chatIds: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enabled) {
      if (!data.token || data.token.trim().length === 0) {
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

export const mainConfigSchema = z.object({
  ftpd: ftpSchema,
  subnetsAccessRestriction: subnetSchema,
  telegramBot: telegramSchema,
  telemetry: telemetrySchema,
  port: z
    .number({
      error: "modules.settings.validation.port.required",
    })
    .min(1, "modules.settings.validation.port.range")
    .max(65535, "modules.settings.validation.port.range"),
});

export type MainConfigFormData = z.infer<typeof mainConfigSchema>;
