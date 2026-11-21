"use client";

import type { ApiKey, CreatedApiKey } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { AccessArea, type AccessMap } from "@shared/access/areas";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, KeyRound, Pencil } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useCreateApiKeyMutation, useMcpSettings, useUpdateApiKeyMutation } from "../api/api-keys.queries";
import { toAccessMap, toAccessMapDto } from "../data/access-areas";
import { useAccessErrorMessage } from "../lib/access-errors";
import { AccessMatrix } from "../ui/access/AccessMatrix";
import { ServerAccessField } from "../ui/access/ServerAccessField";
import { useAccessLimit } from "../ui/access/useAccessContext";
import { ApiKeyToken } from "../ui/api-keys/ApiKeyToken";

const key = (name: string) => `modules.settings.apiKeys.form.${name}`;

const EXPIRY = ["never", "30", "90", "365"] as const;
type Expiry = (typeof EXPIRY)[number];

const DAY = 24 * 60 * 60 * 1000;

const expiryTime = (expiry: Expiry) => (expiry === "never" ? null : Date.now() + Number(expiry) * DAY);

// A key never manages keys or reads assistant chats, the backend refuses it too
const HIDDEN_AREAS: readonly AccessArea[] = [AccessArea.API, AccessArea.ASSISTANT];

const keySchema = z.object({
  name: z.string().trim().min(1, key("nameRequired")).max(64, key("nameMax")),
  expiry: z.enum(EXPIRY),
  mcp: z.boolean(),
  restrict: z.boolean(),
  servers: z.array(z.string()),
  grants: z.custom<AccessMap>(),
});

type KeyFormValues = z.infer<typeof keySchema>;

export interface ApiKeyFormProps {
  apiKey?: ApiKey;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "settings/api-key-form": { props: ApiKeyFormProps; result: void };
  }
}

export default function ApiKeyFormModal({ isOpen, onClose, apiKey }: ModalProps & ApiKeyFormProps) {
  const { t } = useTranslation("modules.settings.apiKeys.form");
  const { t: tRoot } = useTranslation();
  const { notify } = useNotifications();
  const limit = useAccessLimit();
  const mcpSettings = useMcpSettings();
  const errorMessage = useAccessErrorMessage();
  const create = useCreateApiKeyMutation();
  const update = useUpdateApiKeyMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useForm<KeyFormValues>({
    resolver: zodResolver(keySchema),
    defaultValues: {
      name: apiKey?.name ?? "",
      expiry: "never",
      mcp: apiKey?.mcp ?? false,
      restrict: !!apiKey?.servers,
      servers: apiKey?.servers ?? [],
      // Hidden areas would fail the save
      grants: Object.fromEntries(Object.entries(toAccessMap(apiKey?.grants)).filter(([area]) => !HIDDEN_AREAS.includes(area as AccessArea))),
    },
  });
  const { errors } = form.formState;
  const mcp = useWatch({ control: form.control, name: "mcp" });

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const body = {
      name: values.name.trim(),
      grants: toAccessMapDto(values.grants),
      servers: values.restrict ? values.servers : null,
      mcp: values.mcp,
    };
    try {
      if (apiKey) {
        await update.mutateAsync({ id: apiKey.id, data: body });
        notify({ type: "success", title: tRoot("modules.settings.apiKeys.toasts.updated") });
        onClose();
      } else {
        setCreated(await create.mutateAsync({ ...body, expiresAt: expiryTime(values.expiry) }));
      }
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  });

  if (created) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader className="flex-row items-center gap-3">
            <Plate tone="green">
              <KeyRound />
            </Plate>
            <div className="min-w-0">
              <DialogTitle className="truncate">{t("createdTitle", created.key.name)}</DialogTitle>
              <DialogDescription>{t("createdDescription")}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <ApiKeyToken token={created.token} mcp={created.key.mcp} />
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose}>{t("done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="amber">{apiKey ? <Pencil /> : <KeyRound />}</Plate>
          <div className="min-w-0">
            <DialogTitle className="truncate">{apiKey ? t("editTitle", apiKey.name) : t("createTitle")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="contents" noValidate>
          <DialogBody className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Field>
                <FieldLabel htmlFor="api-key-name">{t("name")}</FieldLabel>
                <Input
                  id="api-key-name"
                  autoFocus
                  autoComplete="off"
                  placeholder={t("namePlaceholder")}
                  aria-invalid={!!errors.name}
                  {...form.register("name")}
                />
                {errors.name?.message && <FieldError>{tRoot(errors.name.message)}</FieldError>}
              </Field>
              {!apiKey && (
                <Field>
                  <FieldLabel>{t("expiry")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="expiry"
                    render={({ field }) => (
                      <Select<Expiry> value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                        <SelectTrigger aria-label={t("expiry")}>
                          <SelectValue>{(value: Expiry) => t(`expiryOptions.${value}`)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {EXPIRY.map((option) => (
                            <SelectItem key={option} value={option}>
                              {t(`expiryOptions.${option}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              )}
            </div>

            <section className="grid gap-1.5">
              <Controller
                control={form.control}
                name="mcp"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span className="grid gap-0.5">
                      <span className="font-semibold">{t("mcp")}</span>
                      <span className="text-[12.5px] text-muted-foreground">{t("mcpHint")}</span>
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
              {mcp && mcpSettings.data && !mcpSettings.data.enabled && <p className="text-[12.5px] text-warn">{t("mcpOff")}</p>}
            </section>

            <ServerAccessField
              control={form.control}
              restrictName="restrict"
              serversName="servers"
              label={t("servers")}
              restrictLabel={t("restrict")}
              emptyLabel={t("noServers")}
            />

            <section className="grid gap-2">
              <div className="grid gap-0.5">
                <span className="font-semibold">{t("access")}</span>
                <span className="text-[12.5px] text-muted-foreground">{t("accessHint")}</span>
              </div>
              <p className="flex items-start gap-2 rounded-md border border-warn/25 bg-warn/9 px-3 py-2 text-[12.5px] text-[color-mix(in_oklch,var(--warn),var(--foreground)_30%)]">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {t("dangerNote")}
              </p>
              <Controller
                control={form.control}
                name="grants"
                render={({ field }) => <AccessMatrix value={field.value} onChange={field.onChange} limit={limit} hiddenAreas={HIDDEN_AREAS} />}
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
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {apiKey ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
