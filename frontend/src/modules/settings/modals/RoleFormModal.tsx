"use client";

import type { Role } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Textarea } from "@/shared/ui/textarea";
import type { AccessMap } from "@shared/access/areas";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Info, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCreateRoleMutation, useUpdateRoleMutation } from "../api/roles.queries";
import { toAccessMap, toAccessMapDto, useRoleLabels } from "../data/access-areas";
import { useAccessErrorMessage } from "../lib/access-errors";
import { AccessMatrix } from "../ui/access/AccessMatrix";
import { useAccessLimit, useExtOptions } from "../ui/access/useAccessContext";

const key = (name: string) => `modules.settings.roles.form.${name}`;

const roleSchema = z.object({
  name: z.string().trim().min(1, key("nameRequired")).max(64, key("nameMax")),
  description: z.string().max(500),
  grants: z.custom<AccessMap>(),
  ext: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export interface RoleFormProps {
  role?: Role;
  readOnly?: boolean;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "settings/role-form": { props: RoleFormProps; result: void };
  }
}

export default function RoleFormModal({ isOpen, onClose, role, readOnly }: ModalProps & RoleFormProps) {
  const { t } = useTranslation("modules.settings.roles.form");
  const { t: tRoot } = useTranslation();
  const { notify } = useNotifications();
  const labels = useRoleLabels();
  const limit = useAccessLimit();
  const extOptions = useExtOptions();
  const errorMessage = useAccessErrorMessage();
  const create = useCreateRoleMutation();
  const update = useUpdateRoleMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const builtin = !!role?.builtin;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role ? labels.name(role) : "",
      description: role?.description ?? "",
      grants: toAccessMap(role?.grants),
      ext: role?.ext ?? [],
    },
  });
  const { errors } = form.formState;
  const ext = useWatch({ control: form.control, name: "ext" });

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const body = { description: values.description.trim() || null, grants: toAccessMapDto(values.grants), ext: values.ext };
    try {
      if (role) {
        await update.mutateAsync({ id: role.id, data: builtin ? body : { ...body, name: values.name.trim() } });
        notify({ type: "success", title: tRoot("modules.settings.roles.toasts.updated") });
      } else {
        await create.mutateAsync({ ...body, name: values.name.trim() });
        notify({ type: "success", title: tRoot("modules.settings.roles.toasts.created") });
      }
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="purple">{role ? <ShieldCheck /> : <Plus />}</Plate>
          <div className="min-w-0">
            <DialogTitle className="truncate">{role ? t("editTitle", labels.name(role)) : t("createTitle")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="contents" noValidate>
          <DialogBody className="grid gap-5">
            {(builtin || readOnly) && (
              <p className="flex items-start gap-2 rounded-md border border-border bg-subtle px-3 py-2 text-[12.5px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {readOnly ? t("readOnlyNote") : t("builtinNote")}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <Field>
                <FieldLabel htmlFor="role-name">{t("name")}</FieldLabel>
                <Input
                  id="role-name"
                  autoFocus={!builtin && !readOnly}
                  autoComplete="off"
                  placeholder={t("namePlaceholder")}
                  disabled={builtin || readOnly}
                  aria-invalid={!!errors.name}
                  {...form.register("name")}
                />
                {errors.name?.message && <FieldError>{tRoot(errors.name.message)}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="role-description">{t("descriptionLabel")}</FieldLabel>
                <Textarea
                  id="role-description"
                  rows={1}
                  className="min-h-ctl"
                  placeholder={(role && labels.description({ ...role, description: null })) || t("descriptionPlaceholder")}
                  disabled={readOnly}
                  {...form.register("description")}
                />
              </Field>
            </div>

            <section className="grid gap-2">
              <span className="font-semibold">{t("access")}</span>
              <Controller
                control={form.control}
                name="grants"
                render={({ field }) => (
                  <AccessMatrix
                    value={field.value}
                    onChange={readOnly ? undefined : field.onChange}
                    ext={ext}
                    onExtChange={readOnly ? undefined : (next) => form.setValue("ext", next, { shouldDirty: true })}
                    extOptions={extOptions}
                    limit={limit}
                    readOnly={readOnly}
                  />
                )}
              />
            </section>

            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
              {readOnly ? t("close") : t("cancel")}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                {role ? t("save") : t("create")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
