import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import React from "react";

interface RowWithTooltipProps {
  rowContent: React.ReactNode;
  tooltipContent: React.ReactNode;
}

const RowWithTooltip: React.FC<RowWithTooltipProps> = ({
  rowContent,
  tooltipContent,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="group cursor-help font-mono text-sm break-words whitespace-pre-wrap transition-all duration-200 ease-in-out hover:opacity-80">
            {rowContent}
          </div>
        }
      />
      <TooltipContent
        className="min-w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800"
        side="top"
        align="start"
      >
        <div className="space-y-3">{tooltipContent}</div>
      </TooltipContent>
    </Tooltip>
  );
};

export default RowWithTooltip;
