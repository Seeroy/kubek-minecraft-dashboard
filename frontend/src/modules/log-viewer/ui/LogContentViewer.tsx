"use client";
import { parseLogLine } from "@/modules/log-viewer/utils/parse-log-line";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo, useRef } from "react";
import LogLineRow from "./LogLineRow";

interface Props {
  content: string;
  searchQuery?: string;
}

const LogContentViewer: React.FC<Props> = ({ content, searchQuery }) => {
  const { t } = useTranslation("modules.logViewer");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    if (!content) return [];
    return content.split(/\r\n|\n/).map(parseLogLine);
  }, [content]);

  const virtualizer = useVirtualizer({
    count: parsed.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => 22,
    overscan: 30,
  });

  if (parsed.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        {t("content.noSelection")}
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollerRef}
      className="h-[90%] overflow-auto rounded-md border border-border bg-card/40"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {items.map((vr) => (
          <div
            key={vr.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${vr.start}px)`,
              padding: "0 12px",
              minWidth: "100%",
              width: "max-content",
            }}
            data-index={vr.index}
            ref={virtualizer.measureElement}
          >
            <LogLineRow line={parsed[vr.index]} highlight={searchQuery} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogContentViewer;
