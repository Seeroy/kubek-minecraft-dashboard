import { Card, CardContent } from "@/shared/ui/card";
import { FormLabel } from "@/shared/ui/form";
import { LucideIcon } from "lucide-react";

interface PermissionCardProps {
  permission: {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
  };
  isSelected: boolean;
  onToggle: () => void;
}

export function PermissionCard({
  permission,
  isSelected,
  onToggle,
}: PermissionCardProps) {
  const IconComponent = permission.icon;

  return (
    <Card
      className={`cursor-pointer gap-0 border-2 py-3 transition-all hover:border-primary/50 ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:shadow-sm"
      }`}
      onClick={onToggle}
    >
      <CardContent className="px-3">
        <div className="flex items-start gap-2">
          <div className={`shrink-0 rounded-md p-1 ${permission.color}`}>
            <IconComponent className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <FormLabel className="cursor-pointer text-sm leading-tight font-medium">
              {permission.label}
            </FormLabel>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {permission.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
