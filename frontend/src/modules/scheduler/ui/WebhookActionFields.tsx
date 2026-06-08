import type { Translator } from "@/locales/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type { FormState } from "../types";

interface WebhookActionFieldsProps {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  t: Translator;
}

export const WebhookActionFields = ({
  state,
  set,
  t,
}: WebhookActionFieldsProps) => {
  const httpMethodItems = (
    ["GET", "POST", "PUT", "PATCH", "DELETE"] as const
  ).map((m) => ({
    value: m,
    label: m,
  }));

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>{t("form.actionFields.webhookUrlLabel")}</Label>
          <Input
            placeholder={t("form.actionFields.webhookUrlPlaceholder")}
            value={state.webhookUrl}
            onChange={(e) => set("webhookUrl", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("form.actionFields.webhookMethodLabel")}</Label>
          <Select
            items={httpMethodItems}
            value={state.webhookMethod}
            onValueChange={(v) =>
              set("webhookMethod", v as FormState["webhookMethod"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {httpMethodItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t("form.actionFields.webhookHeadersLabel")}</Label>
        <Textarea
          rows={3}
          placeholder='{"Content-Type": "application/json"}'
          className="font-mono text-xs"
          value={state.webhookHeaders}
          onChange={(e) => set("webhookHeaders", e.target.value)}
        />
      </div>
      {state.webhookMethod !== "GET" && (
        <div className="space-y-1.5">
          <Label>{t("form.actionFields.webhookBodyLabel")}</Label>
          <Textarea
            rows={4}
            className="font-mono text-xs"
            value={state.webhookBody}
            onChange={(e) => set("webhookBody", e.target.value)}
          />
        </div>
      )}
    </>
  );
};
