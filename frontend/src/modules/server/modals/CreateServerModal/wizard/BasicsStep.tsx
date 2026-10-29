import { VariableControl } from "@/modules/server/ui/VariableControl";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { FileDropZone } from "@/shared/ui/file-drop-zone";
import { Input } from "@/shared/ui/input";
import { Box, Coffee, FileArchive, Network, Server, SlidersHorizontal, Tag } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { blueprintNeedsCoreFile, primaryPort, type WizardValues } from "./buildBlueprintSchema";
import { JavaPicker } from "./JavaPicker";
import { WizardField, WizardSection } from "./WizardField";

// Rendered by dedicated controls, here or on the advanced step
const OWN_CONTROLS = new Set(["XMS", "XMX", "JVM_ARGS", "JAVA_VERSION"]);

interface BasicsStepProps {
  form: UseFormReturn<WizardValues>;
  blueprint: BlueprintSummary;
  versionVarKey: string | undefined;
  versions: string[] | undefined;
  versionsLoading: boolean;
  javaResolving: boolean;
  recommendedJava: number | null;
  /** Docker images ship their own Java, so custom paths do not apply */
  docker: boolean;
  portOwner: (port: number) => string | undefined;
  freePort: number;
}

export function BasicsStep(props: BasicsStepProps) {
  const { form, blueprint, versionVarKey, versions, versionsLoading, javaResolving, recommendedJava, docker, portOwner, freePort } = props;
  const { t } = useTranslation("modules.newServerModal");
  // Validation messages are full translation keys
  const { t: tRoot } = useTranslation();
  const { errors } = form.formState;
  const [variables, port, javaPath, customFile] = useWatch({ control: form.control, name: ["variables", "port", "javaPath", "customFile"] });

  const portSpec = primaryPort(blueprint);
  const portKey = portSpec?.label?.toLowerCase();
  const portLabel = portKey === "game" || portKey === "proxy" ? t(`blueprint.ports.${portKey}`) : (portSpec?.label ?? t("general.port.label"));
  const owner = Number.isFinite(port) ? portOwner(port) : undefined;
  const editable = blueprint.variables.filter((v) => v.userEditable !== false && !OWN_CONTROLS.has(v.key));
  const hasJava = blueprint.variables.some((v) => v.key === "JAVA_VERSION");
  const version = versionVarKey ? variables?.[versionVarKey] : undefined;
  const setVariable = (key: string, value: string | number | boolean) => form.setValue(`variables.${key}`, value, { shouldValidate: true });
  const message = (raw: string | undefined) => (raw?.startsWith("modules.") ? tRoot(raw) : raw);

  const pickFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".jar")) {
      form.setError("customFile", { message: "modules.newServerModal.core.custom.invalid" });
      return;
    }
    form.setValue("customFile", file, { shouldValidate: true });
  };

  return (
    <>
      <WizardSection icon={Server} tone="blue" title={t("general.parameters")}>
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <WizardField label={t("general.name.label")} icon={Tag} htmlFor="server-name" error={message(errors.name?.message)}>
            <Input
              id="server-name"
              autoFocus
              autoComplete="off"
              maxLength={60}
              placeholder={t("general.name.placeholder")}
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
          </WizardField>

          <WizardField
            label={portLabel}
            icon={Network}
            htmlFor="server-port"
            error={message(errors.port?.message)}
            warning={owner && t("general.port.busy", owner)}
            hint={t("general.port.free", freePort)}
          >
            <Input id="server-port" type="number" className="font-mono" aria-invalid={!!errors.port} {...form.register("port", { valueAsNumber: true })} />
          </WizardField>

          {blueprintNeedsCoreFile(blueprint) && (
            <WizardField label={t("core.custom.label")} icon={FileArchive} error={message(errors.customFile?.message)} wide>
              <FileDropZone
                icon={<FileArchive />}
                tone={customFile ? "green" : "gray"}
                title={customFile ? t("core.custom.selected", customFile.name) : t("core.custom.title")}
                hint={t("core.custom.hint")}
                accept=".jar"
                buttonLabel={t("core.custom.choose")}
                busyLabel={t("core.custom.choose")}
                busy={false}
                onFile={pickFile}
              />
            </WizardField>
          )}

          {editable.map((variable) => {
            const isVersion = variable.key === versionVarKey;
            const label = isVersion ? t("core.version.label") : (variable.label ?? variable.key);
            const id = `var-${variable.key}`;
            return (
              <WizardField
                key={variable.key}
                label={label}
                icon={isVersion ? Box : SlidersHorizontal}
                htmlFor={id}
                hint={variable.description}
                error={message(errors.variables?.[variable.key]?.message)}
              >
                <VariableControl
                  id={id}
                  variable={variable}
                  label={label}
                  value={variables?.[variable.key]}
                  onChange={(value) => setVariable(variable.key, value)}
                  versions={isVersion ? versions : undefined}
                  versionsLoading={isVersion && versionsLoading}
                  invalid={!!errors.variables?.[variable.key]}
                  segmented
                />
              </WizardField>
            );
          })}
        </div>
      </WizardSection>

      {hasJava && (
        <WizardSection icon={Coffee} tone="orange" title={t("java.version.label")}>
          <JavaPicker
            value={variables?.JAVA_VERSION as number | undefined}
            onChange={(major) => setVariable("JAVA_VERSION", major)}
            path={javaPath}
            onPathChange={docker ? undefined : (path) => form.setValue("javaPath", path)}
            recommended={recommendedJava}
            resolving={javaResolving}
            coreLabel={[blueprint.shortName ?? blueprint.name, version].filter(Boolean).join(" ")}
          />
        </WizardSection>
      )}
    </>
  );
}
