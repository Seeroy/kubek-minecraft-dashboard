"use client";

import type { Account } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { ModalProps } from "@/shared/types/modal.types";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import type { AccessMap } from "@shared/access/areas";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCreateAccountMutation, useUpdateAccountMutation } from "../api/accounts.queries";
import { useRoles } from "../api/roles.queries";
import { toAccessMap, toAccessMapDto } from "../data/access-areas";
import { useAccessErrorMessage } from "../lib/access-errors";
import { AccessMatrix } from "../ui/access/AccessMatrix";
import { AccessSummary } from "../ui/access/AccessSummary";
import { RolePicker } from "../ui/access/RolePicker";
import { useAccessLimit, useExtOptions, useInheritedRoles } from "../ui/access/useAccessContext";
import { AccountFtpPassword } from "../ui/ftp/AccountFtpPassword";

const key = (name: string) => `modules.settings.userForm.validation.${name}`;

// Editing keeps the current password when the field stays empty
const userSchema = (editing: boolean) =>
  z.object({
    username: z
      .string()
      .min(3, key("usernameMin"))
      .max(32, key("usernameMax"))
      .regex(/^[a-zA-Z0-9_]+$/, key("usernameRegex")),
    password: editing
      ? z.string().refine((value) => !value || (value.length >= 6 && value.length <= 64), key("passwordLength"))
      : z.string().min(6, key("passwordLength")).max(64, key("passwordLength")),
    restrict: z.boolean(),
    allowed: z.array(z.string()),
    roles: z.array(z.string()),
    grants: z.custom<AccessMap>(),
    ext: z.array(z.string()),
  });

type UserFormValues = z.infer<ReturnType<typeof userSchema>>;

export interface UserFormProps {
  account?: Account;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "settings/user-form": { props: UserFormProps; result: void };
  }
}

export default function UserFormModal({ isOpen, onClose, account }: ModalProps & UserFormProps) {
  const { t } = useTranslation("modules.settings.userForm");
  const { t: tRoot } = useTranslation();
  const { notify } = useNotifications();
  const { servers } = useServerStore();
  const roles = useRoles();
  const extOptions = useExtOptions();
  const limit = useAccessLimit();
  const errorMessage = useAccessErrorMessage();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const create = useCreateAccountMutation();
  const update = useUpdateAccountMutation();
  const pending = create.isPending || update.isPending;
  const editing = !!account;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema(editing)),
    defaultValues: {
      username: account?.username ?? "",
      password: "",
      restrict: account?.serversRestrict?.enabled ?? false,
      allowed: account?.serversRestrict?.allowed ?? [],
      roles: account?.roles ?? [],
      grants: toAccessMap(account?.grants),
      ext: account?.extPermissions ?? [],
    },
  });
  const { errors } = form.formState;
  const [restrict, roleIds, grants, ext] = useWatch({ control: form.control, name: ["restrict", "roles", "grants", "ext"] });
  const inherited = useInheritedRoles(roles.data, roleIds);
  const error = (message: string | undefined) => (message ? <FieldError>{tRoot(message)}</FieldError> : null);

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await save(values);
      onClose();
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  });

  const save = async (values: UserFormValues) => {
    const username = values.username.trim();
    const access = { roles: values.roles, grants: toAccessMapDto(values.grants), extPermissions: values.ext };
    if (account) {
      await update.mutateAsync({
        username: account.username,
        data: {
          username,
          ...access,
          serversRestrict: { enabled: values.restrict, allowed: values.allowed },
          ...(values.password ? { password: values.password } : {}),
        },
      });
      notify({ type: "success", title: tRoot("modules.settings.users.toasts.updated") });
    } else {
      await create.mutateAsync({
        username,
        password: values.password,
        ...access,
        servers: values.restrict ? values.allowed : undefined,
      });
      notify({ type: "success", title: tRoot("modules.settings.users.toasts.created") });
    }
  };

  const toggleIn = (list: string[], id: string, on: boolean) => (on ? [...list, id] : list.filter((item) => item !== id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="blue">{editing ? <Pencil /> : <Plus />}</Plate>
          <div className="min-w-0">
            <DialogTitle className="truncate">{account ? t("editTitle", account.username) : t("createTitle")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="contents" noValidate>
          <DialogBody className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="user-name">{t("username")}</FieldLabel>
                <Input
                  id="user-name"
                  autoFocus
                  autoComplete="off"
                  placeholder={t("usernamePlaceholder")}
                  aria-invalid={!!errors.username}
                  {...form.register("username")}
                />
                {error(errors.username?.message)}
              </Field>
              <Field>
                <FieldLabel htmlFor="user-password">{t("password")}</FieldLabel>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={editing ? t("passwordKeep") : t("passwordPlaceholder")}
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                {error(errors.password?.message)}
              </Field>
            </div>

            {account && <AccountFtpPassword account={account} />}

            <section className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t("serverAccess")}</span>
                <Controller
                  control={form.control}
                  name="restrict"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-medium">
                      {t("restrict")}
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    </label>
                  )}
                />
              </div>
              {servers.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground">{t("noServers")}</p>
              ) : (
                <Controller
                  control={form.control}
                  name="allowed"
                  render={({ field }) => (
                    <div className={cn("flex flex-wrap gap-1.5 transition-opacity", !restrict && "pointer-events-none opacity-40")}>
                      {servers.map((server) => (
                        <label
                          key={server.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-border py-1.5 pr-2.5 pl-2 hover:bg-hover has-data-checked:border-primary/50 has-data-checked:bg-primary/6"
                        >
                          <Checkbox
                            // Unrestricted users reach every server, so all look picked
                            checked={!restrict || field.value.includes(server.id)}
                            disabled={!restrict}
                            onCheckedChange={(checked) => field.onChange(toggleIn(field.value, server.id, checked))}
                          />
                          <ServerAvatar serverId={server.id} name={server.name} className="size-5 rounded-[5px]" />
                          <span className="text-[13px] font-medium">{server.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                />
              )}
            </section>

            <section className="grid gap-2">
              <div className="grid gap-0.5">
                <span className="font-semibold">{t("roles")}</span>
                <span className="text-[12.5px] text-muted-foreground">{t("rolesHint")}</span>
              </div>
              <Controller
                control={form.control}
                name="roles"
                render={({ field }) => <RolePicker roles={roles.data} loading={roles.isLoading} limit={limit} value={field.value} onChange={field.onChange} />}
              />
            </section>

            <section className="grid gap-2">
              <div className="grid gap-0.5">
                <span className="font-semibold">{t("ownAccess")}</span>
                <span className="text-[12.5px] text-muted-foreground">{t("ownAccessHint")}</span>
              </div>
              <Controller
                control={form.control}
                name="grants"
                render={({ field }) => (
                  <AccessMatrix
                    value={field.value}
                    onChange={field.onChange}
                    ext={ext}
                    onExtChange={(next) => form.setValue("ext", next, { shouldDirty: true })}
                    extOptions={extOptions}
                    inherited={inherited}
                    limit={limit}
                  />
                )}
              />
            </section>

            <section className="grid gap-2 rounded-lg border border-dashed border-border bg-subtle px-3.5 py-3">
              <span className="label-caps">{t("summary")}</span>
              <AccessSummary roles={inherited} grants={grants} ext={ext} isAdmin={account?.isAdmin} />
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
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {editing ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
