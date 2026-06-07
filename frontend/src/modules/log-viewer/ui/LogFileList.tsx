"use client";
import type { ILogFile } from "@/modules/log-viewer/types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import React from "react";
import LogFileItem from "./LogFileItem";

interface Props {
  files: ILogFile[];
  selected?: string;
  onSelect: (name: string) => void;
}

const LogFileList: React.FC<Props> = ({ files, selected, onSelect }) => {
  const { t } = useTranslation("modules.logViewer");
  if (files.length === 0) {
    return (
      <p className="px-2 py-4 text-sm text-muted-foreground italic">
        {t("list.empty")}
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {files.map((f) => (
        <LogFileItem
          key={f.name}
          file={f}
          selected={selected === f.name}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default LogFileList;
