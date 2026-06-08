import type { Translator } from "@/locales/types";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { FileText } from "lucide-react";

interface ChangelogPanelProps {
  changelog: string;
  t: Translator;
}

export function ChangelogPanel({ changelog, t }: ChangelogPanelProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40">
      <div className="flex items-center gap-2 border-b border-border/50 p-3">
        <FileText className="h-4 w-4" />
        <Label className="text-sm font-medium">{t("sections.changelog")}</Label>
      </div>
      <ScrollArea className="h-32">
        <div className="p-3">
          <pre className="font-sans text-xs whitespace-pre-wrap text-muted-foreground">
            {changelog}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}
