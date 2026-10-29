"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Panel, PanelActions, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { EyeOff, GripVertical } from "lucide-react";
import { useState, type ReactNode } from "react";
import { WidgetActionsSlot, WidgetMetaSlot } from "./WidgetActions";

interface DashboardWidgetProps {
  title: string;
  editMode: boolean;
  onHide?: () => void;
  contentClassName?: string;
  children: ReactNode;
}

export default function DashboardWidget({ title, editMode, onHide, contentClassName, children }: DashboardWidgetProps) {
  const { t } = useTranslation("modules.dashboard.toolbar");
  const [actionsNode, setActionsNode] = useState<HTMLDivElement | null>(null);
  const [metaNode, setMetaNode] = useState<HTMLSpanElement | null>(null);

  return (
    <Panel className="h-full overflow-hidden">
      {/* The grid finds its drag target by this class name */}
      <PanelHead className={cn(editMode && "dashboard-drag-handle cursor-move select-none")}>
        {editMode && <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />}
        <PanelTitle className="truncate">{title}</PanelTitle>
        <PanelMeta ref={setMetaNode} />
        <PanelActions ref={setActionsNode} hidden={editMode} />
        {editMode && onHide && (
          <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onHide} aria-label={t("hide")} title={t("hide")}>
            <EyeOff />
          </Button>
        )}
      </PanelHead>
      <WidgetMetaSlot value={metaNode}>
        <WidgetActionsSlot value={actionsNode}>
          <div className={cn("min-h-0 flex-1 scrollbar-thin overflow-auto p-4", contentClassName)}>{children}</div>
        </WidgetActionsSlot>
      </WidgetMetaSlot>
    </Panel>
  );
}
