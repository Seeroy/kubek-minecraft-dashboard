import { serverNameSchema } from "@/modules/server";
import type {
  BlueprintSummary,
  BlueprintVariable,
  PortSpec,
} from "@/shared/types/server-types.types";
import { z } from "zod";

export interface WizardValues {
  name: string;
  blueprintId: string;
  port: number;
  variables: Record<string, string | number | boolean>;
  customFile?: File;
}

/** Blank form state before a blueprint is picked */
export const EMPTY_WIZARD_VALUES: WizardValues = {
  name: "",
  blueprintId: "",
  port: 25565,
  variables: {},
  customFile: undefined,
};

const CUSTOM_BLUEPRINT_ID = "com.kubek.custom";

/** A blueprint with no version list needs an uploaded core file */
export function blueprintNeedsCoreFile(bp: BlueprintSummary): boolean {
  return bp.id === CUSTOM_BLUEPRINT_ID;
}

export function primaryPort(bp: BlueprintSummary): PortSpec | undefined {
  return bp.ports.find((p) => p.primary) ?? bp.ports[0];
}

function parseRules(rules?: string): string[] {
  return (rules ?? "")
    .split("|")
    .map((r) => r.trim())
    .filter(Boolean);
}

/** Build a Zod schema for one blueprint variable */
function zodForVariable(variable: BlueprintVariable): z.ZodTypeAny {
  const rules = parseRules(variable.rules);
  const required = rules.includes("required");

  if (variable.type === "number") {
    let schema = z.coerce.number();
    const min = rules.find((r) => r.startsWith("min:"));
    if (min) schema = schema.min(Number(min.split(":")[1]));
    const max = rules.find((r) => r.startsWith("max:"));
    if (max) schema = schema.max(Number(max.split(":")[1]));
    return schema;
  }

  if (variable.type === "boolean") {
    const schema = z.coerce.boolean();
    return rules.includes("accepted")
      ? schema.refine((v) => v === true, "Required")
      : schema;
  }

  // string | enum | secret
  let schema = z.string();
  if (rules.includes("url")) schema = schema.url();
  if (required)
    return schema.min(1, `${variable.label ?? variable.key} is required`);
  return schema.optional();
}

/** Build the form schema + default values for a selected blueprint */
export function buildBlueprintForm(bp: BlueprintSummary): {
  schema: z.ZodTypeAny;
  defaults: WizardValues;
} {
  const variableShape: Record<string, z.ZodTypeAny> = {};
  const variableDefaults: Record<string, string | number | boolean> = {};

  for (const variable of bp.variables) {
    variableShape[variable.key] = zodForVariable(variable);
    if (variable.default !== undefined)
      variableDefaults[variable.key] = variable.default;
    else if (variable.type === "boolean")
      variableDefaults[variable.key] = false;
    else if (variable.type === "number") variableDefaults[variable.key] = 0;
    else variableDefaults[variable.key] = "";
  }

  const port = primaryPort(bp);
  const fileSchema = blueprintNeedsCoreFile(bp)
    ? z.instanceof(File, { message: "A .jar file is required" })
    : z.instanceof(File).optional();

  const baseSchema = z.object({
    name: serverNameSchema,
    blueprintId: z.string().min(1),
    port: z.coerce.number().min(1).max(65535),
    variables: z.object(variableShape),
    customFile: fileSchema,
  });

  // When the blueprint exposes both memory variables, the initial heap must not exceed the max
  const hasMemoryPair =
    bp.variables.some((v) => v.key === "XMS") &&
    bp.variables.some((v) => v.key === "XMX");
  const schema = hasMemoryPair
    ? baseSchema.superRefine((values, ctx) => {
        const xms = Number(values.variables?.XMS);
        const xmx = Number(values.variables?.XMX);
        if (Number.isFinite(xms) && Number.isFinite(xmx) && xmx < xms) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["variables", "XMX"],
            message: "modules.newServerModal.advanced.memory.errors.order",
          });
        }
      })
    : baseSchema;

  return {
    schema,
    defaults: {
      name: "",
      blueprintId: bp.id,
      port: port?.default ?? 25565,
      variables: variableDefaults,
      customFile: undefined,
    },
  };
}
