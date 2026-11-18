export function GameGroupHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <h3 className="flex items-center gap-2 text-[13px] font-semibold">
      {title}
      <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
        {count}
      </span>
    </h3>
  );
}
