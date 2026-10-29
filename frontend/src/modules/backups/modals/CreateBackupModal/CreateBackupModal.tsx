"use client";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Slider } from "@/shared/ui/slider";
import { Spinner } from "@/shared/ui/spinner";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { BackupType, SelectionMode, type BackupFormat } from "@shared/types/backup.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Database, SlidersHorizontal } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useCreateBackupMutation } from "../../api/backups.queries";
import { typeLook } from "../../lib/look";
import { createBackupSchema, defaultBackupValues, type CreateBackupFormValues } from "./schema";
import { ExclusionsField } from "./ExclusionsField";
import { FilePicker } from "./FilePicker";

export interface CreateBackupProps {
  serverId?: string;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "backups/create": { props: CreateBackupProps; result: void };
  }
}

type CreateBackupModalProps = ModalProps & CreateBackupProps;

export function CreateBackupModal({ isOpen, onClose, serverId }: CreateBackupModalProps) {
  const { t } = useTranslation("modules.backups.createModal");
  // Validation messages are full translation keys
  const { t: tRoot } = useTranslation();
  const { selectedServer } = useServerStore();
  const targetId = serverId ?? selectedServer?.id;
  const create = useCreateBackupMutation(targetId);

  const form = useForm<CreateBackupFormValues>({
    resolver: zodResolver(createBackupSchema),
    defaultValues: defaultBackupValues,
  });
  const { errors } = form.formState;
  const type = useWatch({ control: form.control, name: "type" });
  const errorOf = (message: string | undefined) => (message ? [{ message: tRoot(message) }] : undefined);

  const submit = form.handleSubmit(async (values) => {
    if (!targetId) return;
    // A partial backup is always the files picked below
    const partial = values.type === "partial";
    await create.mutateAsync({
      ...values,
      name: values.name.trim(),
      type: values.type as BackupType,
      format: values.format as BackupFormat,
      selectionMode: partial ? SelectionMode.CUSTOM : SelectionMode.ALL,
      serverId: targetId,
      selectedFiles: partial ? values.selectedFiles.map((path) => ({ name: path.split("/").pop() || path, path })) : undefined,
    });
    onClose();
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !create.isPending && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="blue">
            <Database />
          </Plate>
          <div>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>

        <form id="create-backup" onSubmit={submit} className="contents" noValidate>
          <DialogBody className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="backup-name">{t("name")} *</FieldLabel>
                <Input id="backup-name" autoFocus maxLength={100} placeholder={t("namePlaceholder")} aria-invalid={!!errors.name} {...form.register("name")} />
                <FieldError errors={errorOf(errors.name?.message)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="backup-description">{t("descriptionLabel")}</FieldLabel>
                <Input id="backup-description" maxLength={500} placeholder={t("descriptionPlaceholder")} {...form.register("description")} />
                <FieldError errors={errorOf(errors.description?.message)} />
              </Field>
            </div>

            <Field>
              <span className="font-medium">{t("type")}</span>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3 sm:grid-cols-2">
                    {(["full", "partial"] as const).map((key) => {
                      const { icon: Icon, tone } = typeLook[key as BackupType];
                      return (
                        <FieldLabel key={key}>
                          <Field orientation="horizontal" className="items-start">
                            <Plate tone={tone} size="sm">
                              <Icon />
                            </Plate>
                            <FieldContent>
                              <FieldTitle>{t(`${key}.title`)}</FieldTitle>
                              <FieldDescription>{t(`${key}.description`)}</FieldDescription>
                            </FieldContent>
                            <RadioGroupItem value={key} className="sr-only" />
                          </Field>
                        </FieldLabel>
                      );
                    })}
                  </RadioGroup>
                )}
              />
            </Field>

            {type === "partial" && targetId && (
              <Field>
                <Controller
                  control={form.control}
                  name="selectedFiles"
                  render={({ field }) => (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t("pickFiles")}</span>
                        <span className="text-xs text-muted-foreground">{t("selectedCount", field.value.length)}</span>
                      </div>
                      <FilePicker serverId={targetId} selected={field.value} onChange={field.onChange} />
                    </>
                  )}
                />
                <FieldError errors={errorOf(errors.selectedFiles?.message)} />
              </Field>
            )}

            <Collapsible className="rounded-lg border border-border">
              <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 p-3 font-medium outline-none focus-visible:outline-2 focus-visible:outline-primary/70">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                {t("advanced")}
                <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-data-panel-open:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 border-t border-border p-3">
                <Field>
                  <span className="font-medium">{t("format")}</span>
                  <Controller
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <ToggleGroup variant="segmented" value={[field.value]} onValueChange={(next) => next[0] && field.onChange(next[0])}>
                        <Toggle variant="segmented" value="zip">
                          ZIP
                        </Toggle>
                        <Toggle variant="segmented" value="tar.gz">
                          TAR.GZ
                        </Toggle>
                      </ToggleGroup>
                    )}
                  />
                </Field>
                <Controller
                  control={form.control}
                  name="compressionRatio"
                  render={({ field }) => (
                    <Field>
                      <span className="font-medium">{t("compression", field.value)}</span>
                      <Slider
                        min={1}
                        max={9}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(Array.isArray(value) ? value[0] : value)}
                        aria-label={t("compression", field.value)}
                      />
                      <div className="flex justify-between text-[11.5px] text-muted-foreground">
                        <span>{t("compressionFast")}</span>
                        <span>{t("compressionBest")}</span>
                      </div>
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="globExceptions"
                  render={({ field }) => <ExclusionsField value={field.value} onChange={field.onChange} />}
                />
                <FieldError errors={errors.globExceptions?.map?.((error) => (error?.message ? { message: tRoot(error.message) } : undefined))} />
              </CollapsibleContent>
            </Collapsible>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={create.isPending} onClick={onClose}>
              {tRoot("modules.backups.actions.cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending || !targetId}>
              {create.isPending ? <Spinner /> : <Database />}
              {create.isPending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
