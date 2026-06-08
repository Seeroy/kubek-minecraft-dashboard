import { UserPermissions } from "@shared/types/user.types";
import { z } from "zod";

/**
 * User schema for creation
 */
export const userSchema = z.object({
  username: z
    .string()
    .min(3, "validation.username.min")
    .max(32, "validation.username.max")
    .regex(/^[a-zA-Z0-9_]+$/, "validation.username.regex"),
  password: z
    .string()
    .min(6, "validation.password.min")
    .max(64, "validation.password.max"),
  serversRestrict: z.object({
    enabled: z.boolean(),
    allowed: z.array(z.string().min(1, "validation.servers.empty")),
  }),
  permissions: z
    .array(z.enum(UserPermissions))
    .min(1, "validation.permissions.min"),
});

/**
 * User schema for editing (password is optional)
 */
export const userEditSchema = z.object({
  username: z
    .string()
    .min(3, "validation.username.min")
    .max(32, "validation.username.max")
    .regex(/^[a-zA-Z0-9_]+$/, "validation.username.regex"),
  password: z
    .string()
    .optional()
    .refine((val) => !val || (val.length >= 6 && val.length <= 64), {
      message: "validation.password.edit",
    }),
  serversRestrict: z.object({
    enabled: z.boolean(),
    allowed: z.array(z.string().min(1, "validation.servers.empty")),
  }),
  permissions: z
    .array(z.enum(UserPermissions))
    .min(1, "validation.permissions.min"),
});

export type UserFormData = z.infer<typeof userSchema>;
export type UserEditFormData = z.infer<typeof userEditSchema>;
export type UserFormDataUnion = UserFormData | UserEditFormData;
