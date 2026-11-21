import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { ServerOff, type LucideIcon } from "lucide-react";

interface NoServerEmptyProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function NoServerEmpty({ title, description, icon: Icon = ServerOff, className }: NoServerEmptyProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );
}
