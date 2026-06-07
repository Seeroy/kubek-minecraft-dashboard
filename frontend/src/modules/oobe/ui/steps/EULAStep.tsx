"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Checkbox } from "@/shared/ui/checkbox";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { useState } from "react";

interface EULAStepProps {
  onComplete: () => void;
}

export function EULAStep({ onComplete }: EULAStepProps) {
  const [accepted, setAccepted] = useState(false);
  const { t } = useTranslation("modules.oobe.eulaStep");

  const handleAcceptChange = (checked: boolean) => {
    setAccepted(checked);
    if (checked) {
      onComplete();
    }
  };

  return (
    <div className="space-y-6">
      <ScrollArea className="h-96 w-full rounded-md border p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: t("content") }} />
        </div>
      </ScrollArea>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="eula-accept"
          checked={accepted}
          onCheckedChange={handleAcceptChange}
        />
        <label
          htmlFor="eula-accept"
          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t("acceptLabel")}
        </label>
      </div>
    </div>
  );
}
