import { z } from "zod";

/**
 * Shared server-name validation, used by the create / rename / duplicate /
 * import dialogs
 */
export const serverNameSchema = z
  .string()
  .min(1, "modules.newServerModal.general.name.errors.required")
  .max(50, "modules.newServerModal.general.name.errors.max")
  .regex(
    /^[a-zA-Z0-9-_ ]+$/,
    "modules.newServerModal.general.name.errors.regex"
  );
