"use client";
import { useNotifications } from "@/modules/notifications";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useNow } from "@/shared/hooks/useNow";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ScheduleMode, type IScheduledTask } from "@shared/types/scheduler.types";
import { AlertTriangle, CalendarClock, Clock, Code, Pin, SlidersHorizontal, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCreateScheduledTaskMutation, useCronPreview, useUpdateScheduledTaskMutation } from "../api/scheduler.queries";
import { buildTaskPayload, formStateFromTask, initialFormState, scheduleProblem, simpleToCron, type TaskFormState } from "../lib/form";
import { shortDateTime } from "../lib/look";
import { WEEKDAYS } from "../lib/schedule";
import { ActionFields } from "./task-form/ActionFields";
import { ScheduleFields } from "./task-form/ScheduleFields";
import { TimezoneSelect } from "./task-form/TimezoneSelect";

export interface TaskFormProps {
  serverId: string;
  editingTask?: IScheduledTask | null;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "scheduler/task-form": { props: TaskFormProps; result: boolean };
  }
}

export type SetField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => void;

function Section({ icon, tone, title, children }: { icon: ReactNode; tone: "cyan" | "purple"; title: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex items-center gap-2 font-semibold">
        <Plate tone={tone} size="sm">
          {icon}
        </Plate>
        {title}
      </div>
      {children}
    </section>
  );
}

function SchedulePreview({ state }: { state: TaskFormState }) {
  const { t } = useTranslation("modules.scheduler.form");
  const { t: tRoot } = useTranslation("modules.scheduler");
  const { t: tc } = useTranslation("modules.components");
  const expression = state.mode === ScheduleMode.SIMPLE ? simpleToCron(state) : state.cronExpression.trim();
  const debounced = useDebouncedValue(expression, 300);
  const preview = useCronPreview(debounced, state.timezone, state.mode !== ScheduleMode.ONCE);
  // Ticks so the relative labels and the past check stay current while the dialog is open
  const now = useNow();
  const relative = (timestamp: number) => formatRelative(timestamp, tc("justNow"));

  const box = "grid gap-1 rounded-md border border-dashed border-border bg-subtle p-3 text-[12.5px]";
  const invalid = (text: string) => (
    <div className={box}>
      <span className="flex items-center gap-1.5 font-medium text-danger">
        <AlertTriangle className="size-3.5" />
        {text}
      </span>
    </div>
  );

  const problem = scheduleProblem(state, now);
  if (problem) return invalid(t(problem));

  if (state.mode === ScheduleMode.ONCE) {
    const at = new Date(state.onceDateTime).getTime();
    return (
      <div className={box}>
        <span className="mb-1 flex items-center gap-1.5 font-medium">
          <Pin className="size-3.5" />
          {t("onceRun")}
        </span>
        <span className="flex justify-between tabular-nums">
          {shortDateTime(at)}
          <span className="text-muted-foreground">{relative(at)}</span>
        </span>
      </div>
    );
  }

  if (preview.isError) return invalid(t("previewInvalid"));

  return (
    <div className={box} aria-live="polite">
      <span className="mb-1 flex items-center gap-1.5 font-medium">
        <CalendarClock className="size-3.5" />
        {t("preview")}
        <span className="ml-auto font-mono font-normal text-muted-foreground">{expression}</span>
      </span>
      {preview.data?.nextRuns.map((timestamp) => (
        <span key={timestamp} className="flex justify-between tabular-nums">
          {tRoot(`weekdays.${WEEKDAYS[new Date(timestamp).getDay()]}`)}, {shortDateTime(timestamp)}
          <span className="text-muted-foreground">{relative(timestamp)}</span>
        </span>
      ))}
    </div>
  );
}

export default function TaskFormDialog({ serverId, isOpen, onClose, editingTask = null }: ModalProps<boolean> & TaskFormProps) {
  const { t } = useTranslation("modules.scheduler.form");
  const { t: tRoot } = useTranslation("modules.scheduler");
  const { notify } = useNotifications();
  // The dialog mounts fresh on every open, so the initial state is enough
  const [state, setState] = useState<TaskFormState>(() => (editingTask ? formStateFromTask(editingTask) : initialFormState()));
  const [nameError, setNameError] = useState(false);
  const [headersError, setHeadersError] = useState(false);
  const create = useCreateScheduledTaskMutation(serverId);
  const update = useUpdateScheduledTaskMutation(serverId);
  const pending = create.isPending || update.isPending;

  const set: SetField = (key, value) => setState((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.name.trim()) {
      setNameError(true);
      return;
    }
    // The preview already explains the problem
    if (scheduleProblem(state, Date.now())) return;
    let payload;
    try {
      payload = buildTaskPayload(state);
    } catch {
      setHeadersError(true);
      return;
    }
    if (editingTask) {
      await update.mutateAsync({ id: editingTask.id, data: payload });
      notify({ type: "success", title: tRoot("toasts.updated") });
    } else {
      await create.mutateAsync({ ...payload, serverId });
      notify({ type: "success", title: tRoot("toasts.created") });
    }
    onClose(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !pending && onClose(false)}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="cyan">
            <CalendarClock />
          </Plate>
          <div>
            <DialogTitle>{editingTask ? t("editTitle") : t("createTitle")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} className="contents" noValidate>
          <DialogBody className="grid gap-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <Field>
                <FieldLabel htmlFor="task-name">{t("name")}</FieldLabel>
                <Input
                  id="task-name"
                  autoFocus
                  maxLength={80}
                  value={state.name}
                  placeholder={t("namePlaceholder")}
                  aria-invalid={nameError}
                  onChange={(e) => {
                    setNameError(false);
                    set("name", e.target.value);
                  }}
                />
              </Field>
              <label className="flex h-ctl cursor-pointer items-center gap-2 font-medium">
                {t("enabled")}
                <Switch checked={state.enabled} onCheckedChange={(checked) => set("enabled", checked)} />
              </label>
              {nameError && <FieldError className="col-span-2 -mt-2">{t("nameRequired")}</FieldError>}
            </div>

            <Section icon={<Clock />} tone="cyan" title={t("schedule")}>
              <Tabs value={state.mode} onValueChange={(value) => set("mode", value as ScheduleMode)}>
                <TabsList className="w-full sm:w-fit">
                  <TabsTrigger className="flex-1 px-2 sm:flex-none sm:px-3.5" value={ScheduleMode.SIMPLE}>
                    <SlidersHorizontal />
                    {t("modes.simple")}
                  </TabsTrigger>
                  <TabsTrigger className="flex-1 px-2 sm:flex-none sm:px-3.5" value={ScheduleMode.CRON}>
                    <Code />
                    {t("modes.cron")}
                  </TabsTrigger>
                  <TabsTrigger className="flex-1 px-2 sm:flex-none sm:px-3.5" value={ScheduleMode.ONCE}>
                    <Pin />
                    {t("modes.once")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-lg border border-border p-3 sm:p-4">
                <ScheduleFields state={state} set={set} />
                <SchedulePreview state={state} />
                <TimezoneSelect value={state.timezone} onChange={(value) => set("timezone", value)} />
              </div>
            </Section>

            <Section icon={<Zap />} tone="purple" title={t("action")}>
              <ActionFields
                state={state}
                set={set}
                headersError={headersError}
                onHeadersChange={(value) => {
                  setHeadersError(false);
                  set("webhookHeaders", value);
                }}
              />
            </Section>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onClose(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {editingTask ? t("submitSave") : t("submitCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
