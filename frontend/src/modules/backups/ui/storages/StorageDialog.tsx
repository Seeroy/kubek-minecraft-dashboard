"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { SecretInput } from "@/shared/ui/secret-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import type { BackupStorage } from "@shared/types/backup.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Cloud, PlugZap, XCircle } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useSaveStorageMutation, useTestStorageMutation } from "../../api/backups.queries";
import { presetOf, STORAGE_PRESETS, type StoragePreset } from "./storage-presets";

// Messages are translation keys, the form translates them on display
const INVALID = "modules.backups.storages.invalid";
const REQUIRED = "modules.backups.storages.required";

const schema = (secretStored: boolean) =>
  z.object({
    name: z.string().trim().min(1, REQUIRED).max(64, INVALID),
    endpoint: z.union([z.literal(""), z.url({ protocol: /^https?$/, message: INVALID })]),
    region: z.string().trim().max(64, INVALID),
    bucket: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, INVALID),
    prefix: z.string().max(200, INVALID),
    accessKeyId: z.string().trim().min(1, REQUIRED).max(256, INVALID),
    // A blank key keeps the stored one
    secretAccessKey: secretStored ? z.string().max(256, INVALID) : z.string().min(1, REQUIRED).max(256, INVALID),
    virtualHostedStyle: z.boolean(),
  });

type StorageForm = z.infer<ReturnType<typeof schema>>;

const toForm = (storage?: BackupStorage): StorageForm =>
  storage
    ? { name: storage.name, ...storage.config, secretAccessKey: "" }
    : { name: "", ...STORAGE_PRESETS.aws, bucket: "", prefix: "kubek", accessKeyId: "", secretAccessKey: "" };

export default function StorageDialog({ storage, onClose }: { storage?: BackupStorage; onClose: () => void }) {
  const { t } = useTranslation("modules.backups.storages");
  const { t: tRoot } = useTranslation();
  const { notify } = useNotifications();
  const secret = storage?.config.secretAccessKey;
  const form = useForm<StorageForm>({ resolver: zodResolver(schema(!!secret?.set)), defaultValues: toForm(storage), mode: "onChange" });
  const [preset, setPreset] = useState<StoragePreset>(presetOf(storage?.config.endpoint ?? ""));
  const save = useSaveStorageMutation();
  const test = useTestStorageMutation();
  const { errors } = form.formState;

  const toInput = ({ name, ...config }: StorageForm) => ({ name, config });

  const choosePreset = (next: StoragePreset) => {
    setPreset(next);
    const { endpoint, region, virtualHostedStyle } = STORAGE_PRESETS[next];
    form.setValue("endpoint", endpoint, { shouldValidate: true, shouldDirty: true });
    form.setValue("region", region, { shouldDirty: true });
    form.setValue("virtualHostedStyle", virtualHostedStyle, { shouldDirty: true });
  };

  const runTest = form.handleSubmit((values) => test.mutate({ id: storage?.id, input: toInput(values) }));
  const submit = form.handleSubmit((values) =>
    save.mutate(
      { id: storage?.id, input: toInput(values) },
      {
        onSuccess: () => {
          notify({ type: "success", title: t("saved") });
          onClose();
        },
      }
    )
  );

  const field = (name: keyof StorageForm, label: string, hint?: string) => (
    <Field>
      <FieldLabel htmlFor={`storage-${name}`}>{label}</FieldLabel>
      <Input id={`storage-${name}`} autoComplete="off" aria-invalid={!!errors[name]} {...form.register(name)} />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      {errors[name]?.message && <FieldError>{tRoot(errors[name].message)}</FieldError>}
    </Field>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={submit} className="contents">
          <DialogHeader className="flex-row items-center gap-3">
            <Plate tone="blue">
              <Cloud />
            </Plate>
            <div>
              <DialogTitle>{storage ? t("edit") : t("add")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            {field("name", t("fields.name"))}
            <Field>
              <FieldLabel>{t("preset")}</FieldLabel>
              <Select<StoragePreset> value={preset} onValueChange={(next) => next && choosePreset(next)}>
                <SelectTrigger className="w-full" aria-label={t("preset")}>
                  <SelectValue>{(value: StoragePreset) => t(`presets.${value}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STORAGE_PRESETS) as StoragePreset[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`presets.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">{field("endpoint", t("fields.endpoint"), t("fields.endpointHint"))}</div>
            {field("region", t("fields.region"))}
            {field("bucket", t("fields.bucket"))}
            <div className="sm:col-span-2">{field("prefix", t("fields.prefix"))}</div>
            {field("accessKeyId", t("fields.accessKeyId"))}
            <Field>
              <FieldLabel htmlFor="storage-secretAccessKey">{t("fields.secretAccessKey")}</FieldLabel>
              <SecretInput id="storage-secretAccessKey" secret={secret} aria-invalid={!!errors.secretAccessKey} {...form.register("secretAccessKey")} />
              {errors.secretAccessKey?.message && <FieldError>{tRoot(errors.secretAccessKey.message)}</FieldError>}
            </Field>
            <Field orientation="horizontal" className="sm:col-span-2">
              <Controller
                control={form.control}
                name="virtualHostedStyle"
                render={({ field: control }) => <Switch id="storage-vhost" checked={control.value} onCheckedChange={control.onChange} />}
              />
              <div>
                <FieldLabel htmlFor="storage-vhost">{t("fields.virtualHostedStyle")}</FieldLabel>
                <FieldDescription>{t("fields.virtualHostedStyleHint")}</FieldDescription>
              </div>
            </Field>
            {test.data && (
              <Alert variant={test.data.ok ? "default" : "destructive"} className="sm:col-span-2">
                {test.data.ok ? <CheckCircle2 /> : <XCircle />}
                <AlertDescription>{test.data.ok ? t("testOk") : t("testFailed", test.data.error ?? "?")}</AlertDescription>
              </Alert>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" className="sm:mr-auto" disabled={test.isPending} onClick={() => void runTest()}>
              {test.isPending ? <Spinner /> : <PlugZap />}
              {t("test")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
