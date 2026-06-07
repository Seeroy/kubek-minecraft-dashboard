"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Input } from "@/shared/ui/input";
import { Search } from "lucide-react";
import React from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  matchesCount?: number;
}

const LogSearchBar: React.FC<Props> = ({ value, onChange, matchesCount }) => {
  const { t } = useTranslation("modules.logViewer");
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("search.placeholder")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {value && typeof matchesCount === "number" && (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {matchesCount > 0
            ? t("search.matches", matchesCount)
            : t("search.nothingFound")}
        </span>
      )}
    </div>
  );
};

export default LogSearchBar;
