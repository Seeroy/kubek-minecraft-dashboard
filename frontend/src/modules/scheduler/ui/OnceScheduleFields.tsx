import type { Translator } from "@/locales/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { FormState } from "../types";

interface OnceScheduleFieldsProps {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  t: Translator;
}

export const OnceScheduleFields = ({
  state,
  set,
  t,
}: OnceScheduleFieldsProps) => (
  <div className="space-y-3">
    <div className="space-y-1.5">
      <Label>{t("form.once.dateTimeLabel")}</Label>
      <Input
        type="datetime-local"
        value={state.onceDateTime}
        onChange={(e) => set("onceDateTime", e.target.value)}
      />
    </div>
  </div>
);
