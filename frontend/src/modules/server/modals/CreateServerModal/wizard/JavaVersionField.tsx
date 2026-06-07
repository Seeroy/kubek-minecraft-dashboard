import { useLanguageContext } from "@/shared/context/language-context";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Loader2, Star } from "lucide-react";
import { useJavaVersionOptions } from "@/modules/server/hooks";

interface JavaVersionFieldProps {
  label: string;
  value: number | string | undefined;
  onChange: (value: number) => void;
  /** True while the recommended Java for the selected game version is being resolved */
  isResolving?: boolean;
  /** Major Java version recommended for the selected game version; gets a star badge in the list */
  recommendedVersion?: number | null;
}

export function JavaVersionField({
  label,
  value,
  onChange,
  isResolving,
  recommendedVersion,
}: JavaVersionFieldProps) {
  const { t } = useLanguageContext();
  const { options, isLoading } = useJavaVersionOptions();
  const managed = options.filter((o) => o.managed);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {isResolving ? (
        <div className="flex h-10 items-center gap-2 rounded-md border border-dashed border-muted bg-muted/40 px-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("modules.newServerModal.java.version.resolving")}
        </div>
      ) : isLoading ? (
        <div className="flex h-10 items-center gap-2 rounded-md border border-dashed border-muted bg-muted/40 px-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Java versions
        </div>
      ) : (
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => v != null && onChange(Number(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Java version" />
          </SelectTrigger>
          <SelectContent>
            {managed.map((o) => (
              <SelectItem key={o.version} value={o.version}>
                <span className="flex items-center gap-2">
                  {o.label}
                  {recommendedVersion != null &&
                    Number(o.version) === recommendedVersion && (
                      <Badge
                        variant="warning"
                        className="size-4 px-0"
                        title={t(
                          "modules.newServerModal.java.version.badges.recommended"
                        )}
                      >
                        <Star className="!size-2 fill-current" />
                      </Badge>
                    )}
                  {o.installed && (
                    <Badge variant="success" className="h-4 px-1.5 text-[10px]">
                      {t(
                        "modules.newServerModal.java.version.badges.installed"
                      )}
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
