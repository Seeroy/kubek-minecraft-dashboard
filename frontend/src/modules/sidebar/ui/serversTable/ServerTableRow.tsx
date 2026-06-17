"use client";
import type { Server } from "@/modules/server";
import { SERVER_DND_MIME } from "@/modules/sidebar/hooks/useMoveServerToFolder";
import { cn } from "@/shared/lib/cn";
import { TableCell, TableRow } from "@/shared/ui/table";
import { type Row, flexRender } from "@tanstack/react-table";
import React from "react";

interface Props {
  row: Row<Server>;
  isCreating: boolean;
  selected: boolean;
  selectionMode: boolean;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
}

const ServerTableRow: React.FC<Props> = ({
  row,
  isCreating,
  selected,
  selectionMode,
  onSelect,
  onToggleCheck,
}) => {
  const server = row.original;
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={isCreating ? "cursor-default" : "cursor-pointer"}
      draggable={!selectionMode && !isCreating}
      onDragStart={
        isCreating
          ? undefined
          : (e) => {
              e.dataTransfer.setData(SERVER_DND_MIME, server.id);
              e.dataTransfer.effectAllowed = "move";
            }
      }
      onClick={
        isCreating
          ? undefined
          : () => {
              if (selectionMode) onToggleCheck(server.id);
              else onSelect(server.id);
            }
      }
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(cell.column.columnDef.meta?.cellClassName)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
};

export default ServerTableRow;
