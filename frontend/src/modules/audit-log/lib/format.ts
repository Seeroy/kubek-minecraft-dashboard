import { useTranslation } from "@/shared/hooks/useTranslation";

/** Fallback label for an action with no dedicated translation */
export const humanizeAction = (action: string) => action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Translated label for a raw action such as "server.start" */
export function useActionLabel() {
  const { t } = useTranslation("modules.auditLog.actions");
  return (action: string) => {
    const label = t(action.replace(/\./g, "_"));
    return label.startsWith("NOT TRANSLATED") ? humanizeAction(action) : label;
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "Today, 13:40" for today and "20.10, 13:40" otherwise, the year is in the details */
export function formatEntryTime(timestamp: number, today: (time: string) => string) {
  const d = new Date(timestamp);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? today(time) : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${time}`;
}
