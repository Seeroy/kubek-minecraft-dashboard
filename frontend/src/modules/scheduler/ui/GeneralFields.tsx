import type { Translator } from "@/locales/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { FormState } from "../types";

interface GeneralFieldsProps {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  t: Translator;
}

export const GeneralFields = ({ state, set, t }: GeneralFieldsProps) => (
  <div className="space-y-3">
    <div className="space-y-1.5">
      <Label htmlFor="name">{t("form.nameLabel")}</Label>
      <Input
        id="name"
        placeholder={t("form.namePlaceholder")}
        value={state.name}
        onChange={(e) => set("name", e.target.value)}
        required
      />
    </div>
    <div className="flex items-center gap-3">
      <Switch
        id="enabled"
        checked={state.enabled}
        onCheckedChange={(v) => set("enabled", v)}
      />
      <Label htmlFor="enabled">{t("form.enabledLabel")}</Label>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="tz">{t("form.timezoneLabel")}</Label>
      <Input
        id="tz"
        placeholder={t("form.timezonePlaceholder")}
        value={state.timezone}
        onChange={(e) => set("timezone", e.target.value)}
      />
    </div>
  </div>
);
