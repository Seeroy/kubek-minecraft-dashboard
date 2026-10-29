"use client";
import type { InstallModpackProps, ModpackPreview } from "@/api";
import { useJavaVersionForGame } from "@/modules/java-manager/api/java.queries";
import { ProjectIcon } from "@/modules/plugins/ui/ProjectIcon";
import { serverNameSchema, useServerStore } from "@/modules/server";
import { JavaPicker } from "@/modules/server/modals/CreateServerModal/wizard/JavaPicker";
import { WizardField, WizardSection } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Input } from "@/shared/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/ui/input-group";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { Coffee, Cpu, Info, Network, Server, Tag, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";

export const MODPACK_FORM_ID = "modpack-setup";
const DEFAULT_PORT = 25565;
const DEFAULT_MEMORY = 4096;
// Matches the panel default when the Mojang lookup fails
const FALLBACK_JAVA = 21;

// Every numeric value under a port-like variable of an existing server
function portOwners(servers: { name: string; variables?: Record<string, unknown> }[]) {
  const owners = new Map<number, string>();
  for (const server of servers)
    for (const [key, value] of Object.entries(server.variables ?? {}))
      if ((/PORT$/i.test(key) || key === "game") && Number(value)) owners.set(Number(value), server.name);
  return owners;
}

// Pack titles often carry brackets and symbols the server name rules reject
const suggestName = (title: string) =>
  title
    .replace(/[^a-zA-Z0-9-_ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);

interface ModpackSetupProps {
  preview: ModpackPreview;
  onSubmit: (values: Omit<InstallModpackProps, "packId">) => void;
}

/** What the pack brings plus the few settings a new server needs */
export function ModpackSetup({ preview, onSubmit }: ModpackSetupProps) {
  const { t } = useTranslation("modules.modpacks");
  const { t: tRoot } = useLanguageContext();
  const { servers } = useServerStore();
  const owners = portOwners(servers);
  const java = useJavaVersionForGame(preview.minecraftVersion);
  const recommendedJava = typeof java.data === "number" ? java.data : null;

  const [name, setName] = useState(() => suggestName(preview.name));
  const [port, setPort] = useState(() => {
    let next = DEFAULT_PORT;
    while (owners.has(next)) next++;
    return String(next);
  });
  const [memory, setMemory] = useState(String(DEFAULT_MEMORY));
  const [javaChoice, setJava] = useState<number | null>(null);
  const [javaPath, setJavaPath] = useState("");
  const [touched, setTouched] = useState(false);

  const javaVersion = javaChoice ?? recommendedJava ?? FALLBACK_JAVA;
  const nameCheck = serverNameSchema.safeParse(name.trim());
  const nameTaken = servers.some((s) => s.name === name.trim());
  const nameError = !nameCheck.success ? tRoot(nameCheck.error.issues[0].message) : nameTaken ? t("errors.nameTaken") : undefined;
  const portNumber = Number(port);
  const portError = Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535 ? undefined : t("form.portInvalid");
  const memoryNumber = Number(memory);
  const memoryError = Number.isInteger(memoryNumber) && memoryNumber >= 512 ? undefined : t("form.memoryInvalid");
  const owner = owners.get(portNumber);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (nameError || portError || memoryError) return;
    onSubmit({ name: name.trim(), port: portNumber, memory: memoryNumber, javaVersion, javaPath: javaPath || undefined });
  };

  return (
    <form id={MODPACK_FORM_ID} onSubmit={submit} noValidate>
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <ProjectIcon title={preview.name} iconUrl={preview.iconUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[15px] font-semibold">{preview.name}</b>
          <span className="block truncate text-[12.5px] text-muted-foreground">{preview.summary || preview.version}</span>
        </div>
      </div>

      <KeyValue className="mt-4 rounded-lg bg-subtle px-3 py-2.5">
        <KeyValueItem label={t("preview.minecraft")}>{preview.minecraftVersion}</KeyValueItem>
        <KeyValueItem label={t("preview.loader")}>{preview.loaderVersion}</KeyValueItem>
        <KeyValueItem label={t("preview.mods")}>
          {preview.modCount}
          {preview.fileCount !== preview.modCount && <span className="font-normal text-muted-foreground"> / {t("preview.files", preview.fileCount)}</span>}
        </KeyValueItem>
        <KeyValueItem label={t("preview.download")}>{formatBytes(preview.downloadSize)}</KeyValueItem>
      </KeyValue>

      {(preview.skippedClientOnly > 0 || preview.warnings.length > 0) && (
        <div className="mt-3 grid gap-2">
          {preview.skippedClientOnly > 0 && (
            <Alert>
              <Info />
              <AlertDescription>{t("preview.clientOnly", preview.skippedClientOnly)}</AlertDescription>
            </Alert>
          )}
          {preview.warnings.map((warning) => (
            <Alert key={warning.code}>
              <TriangleAlert className="text-warn" />
              <AlertDescription>{t(`preview.warnings.${warning.code}`, "count" in warning ? warning.count : undefined)}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <WizardSection icon={Server} tone="primary" title={t("form.title")}>
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <WizardField label={t("form.name")} icon={Tag} htmlFor="modpack-name" error={touched || name ? nameError : undefined} wide>
            <Input id="modpack-name" value={name} aria-invalid={!!(touched && nameError)} onChange={(event) => setName(event.target.value)} />
          </WizardField>
          <WizardField label={t("form.port")} icon={Network} htmlFor="modpack-port" error={portError} warning={owner ? t("form.portTaken", owner) : undefined}>
            <Input
              id="modpack-port"
              inputMode="numeric"
              value={port}
              aria-invalid={!!portError}
              onChange={(event) => setPort(event.target.value.replace(/\D/g, ""))}
            />
          </WizardField>
          <WizardField label={t("form.memory")} icon={Cpu} htmlFor="modpack-memory" error={memoryError}>
            <InputGroup>
              <InputGroupInput
                id="modpack-memory"
                inputMode="numeric"
                value={memory}
                aria-invalid={!!memoryError}
                onChange={(event) => setMemory(event.target.value.replace(/\D/g, ""))}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{t("form.memoryUnit")}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </WizardField>
          <WizardField label={t("form.java")} icon={Coffee} wide>
            <JavaPicker
              value={javaVersion}
              onChange={setJava}
              path={javaPath}
              onPathChange={setJavaPath}
              recommended={recommendedJava}
              resolving={java.isLoading}
              coreLabel={`Fabric ${preview.minecraftVersion}`}
            />
          </WizardField>
        </div>
      </WizardSection>
    </form>
  );
}
