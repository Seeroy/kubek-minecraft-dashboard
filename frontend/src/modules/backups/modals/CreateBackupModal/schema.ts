import { z } from "zod";

// Messages are translation keys, the form translates them on display
export const createBackupSchema = z
  .object({
    name: z.string().trim().min(1, "modules.backups.validations.nameRequired").max(100, "modules.backups.validations.nameMax"),
    description: z.string().max(500, "modules.backups.validations.descriptionMax"),
    type: z.enum(["full", "partial"]),
    compressionRatio: z.number().min(1).max(9),
    format: z.enum(["zip", "tar.gz"]),
    selectedFiles: z.array(z.string()),
    globExceptions: z.array(
      z
        .string()
        .max(200, "modules.backups.validations.exclusionMax")
        .refine((value) => !/[<>|]/.test(value), "modules.backups.validations.exclusionInvalid")
    ),
  })
  .refine((data) => data.type !== "partial" || data.selectedFiles.length > 0, {
    message: "modules.backups.validations.customSelectionRequired",
    path: ["selectedFiles"],
  });

export type CreateBackupFormValues = z.infer<typeof createBackupSchema>;

export const defaultBackupValues: CreateBackupFormValues = {
  name: "",
  description: "",
  type: "full",
  compressionRatio: 6,
  format: "zip",
  selectedFiles: [],
  globExceptions: [],
};
