import type { Translator } from "@/locales/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ScheduleMode } from "@shared/types/scheduler.types";
import type { FormState } from "../types";
import { CronScheduleFields } from "./CronScheduleFields";
import { OnceScheduleFields } from "./OnceScheduleFields";
import { SimpleScheduleFields } from "./SimpleScheduleFields";

interface ScheduleModeTabsProps {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleWeekday: (day: number) => void;
  cronPreview: string[];
  cronPreviewError: string | null;
  t: Translator;
}

export const ScheduleModeTabs = ({
  state,
  set,
  toggleWeekday,
  cronPreview,
  cronPreviewError,
  t,
}: ScheduleModeTabsProps) => (
  <Tabs
    value={state.mode}
    onValueChange={(v) => set("mode", v as ScheduleMode)}
  >
    <TabsList>
      <TabsTrigger value={ScheduleMode.SIMPLE}>
        {t("form.modeTabs.simple")}
      </TabsTrigger>
      <TabsTrigger value={ScheduleMode.CRON}>
        {t("form.modeTabs.cron")}
      </TabsTrigger>
      <TabsTrigger value={ScheduleMode.ONCE}>
        {t("form.modeTabs.once")}
      </TabsTrigger>
    </TabsList>

    <TabsContent value={ScheduleMode.SIMPLE} className="mt-4">
      <SimpleScheduleFields
        state={state}
        set={set}
        toggleWeekday={toggleWeekday}
        t={t}
      />
    </TabsContent>

    <TabsContent value={ScheduleMode.CRON} className="mt-4">
      <CronScheduleFields
        state={state}
        set={set}
        cronPreview={cronPreview}
        cronPreviewError={cronPreviewError}
        t={t}
      />
    </TabsContent>

    <TabsContent value={ScheduleMode.ONCE} className="mt-4">
      <OnceScheduleFields state={state} set={set} t={t} />
    </TabsContent>
  </Tabs>
);
