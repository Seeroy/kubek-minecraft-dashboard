"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Input } from "@/shared/ui/input";
import { Search } from "lucide-react";
import React from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const ServersListSearch: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation("modules.sidebar.serversList");

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={t("searchServers")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg pl-9"
        autoFocus
      />
    </div>
  );
};

export default ServersListSearch;
