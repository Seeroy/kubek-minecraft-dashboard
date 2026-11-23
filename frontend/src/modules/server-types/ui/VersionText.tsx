/** A blueprint version for pickers, the label leads and the id follows in small type */
export function VersionText({ id, label }: { id: string; label?: string | null }) {
  if (!label || label === id) return <>{id}</>;
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="truncate">{label}</span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{id}</span>
    </span>
  );
}
