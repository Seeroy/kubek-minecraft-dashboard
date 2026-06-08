import { z } from "zod";

export const createBackupSchema = z
  .object({
    name: z
      .string()
      .min(1, "modules.backups.validations.nameRequired")
      .max(100, "modules.backups.validations.nameMax"),

    description: z
      .string()
      .max(500, "modules.backups.validations.descriptionMax")
      .optional(),

    type: z
      .enum(["full", "partial"])
      .refine((val) => val, "modules.backups.validations.typeRequired"),

    compressionRatio: z
      .number()
      .min(1, "modules.backups.validations.compressionRatioRange")
      .max(9, "modules.backups.validations.compressionRatioRange"),

    format: z
      .enum(["zip", "tar.gz"])
      .refine((val) => val, "modules.backups.validations.formatRequired"),

    selectionMode: z
      .enum(["all", "custom"])
      .refine(
        (val) => val,
        "modules.backups.validations.selectionModeRequired"
      ),

    selectedFiles: z.array(z.string()).optional(),

    globExceptions: z
      .array(
        z
          .string()
          .min(1, "modules.backups.validations.exclusionEmpty")
          .max(200, "modules.backups.validations.exclusionMax")
          .refine(
            (val) => !/[<>|]/.test(val),
            "modules.backups.validations.exclusionInvalid"
          )
      )
      .optional(),
  })
  .refine(
    (data) => {
      // If selection mode is custom, selectedFiles should not be empty for partial backups
      if (data.type === "partial" && data.selectionMode === "custom") {
        return data.selectedFiles && data.selectedFiles.length > 0;
      }
      return true;
    },
    {
      message: "modules.backups.validations.customSelectionRequired",
      path: ["selectedFiles"],
    }
  );

export type CreateBackupFormValues = z.infer<typeof createBackupSchema>;
