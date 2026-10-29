/** Pulsing dot on Panel Settings when a panel update exists */
export function UpdateIndicator({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="ml-auto size-1.5 shrink-0 animate-beat rounded-full bg-primary text-primary sidebar-mini:absolute sidebar-mini:top-2 sidebar-mini:right-3"
    />
  );
}
