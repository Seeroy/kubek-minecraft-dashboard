"use client";

import type { Server } from "@/modules/server";
import { SERVER_DND_MIME } from "@/modules/sidebar/hooks/useMoveServerToFolder";
import { useServerSelectionStore } from "@/modules/sidebar/store/selection.store";
import type { DragEvent, KeyboardEvent } from "react";
import { useServersList } from "./context";

/** Click, keyboard, selection and drag behaviour shared by tiles and rows */
export function useServerItem(server: Server) {
  const { actions, creatingById, selectedServerId } = useServersList();
  const selectionMode = useServerSelectionStore((s) => s.mode);
  const checked = useServerSelectionStore((s) => s.selectedIds.includes(server.id));
  const toggle = useServerSelectionStore((s) => s.toggle);
  const creating = creatingById.get(server.id);

  const activate = () => (selectionMode ? toggle(server.id) : actions.select(server.id));

  const interactive = creating
    ? {}
    : {
        tabIndex: 0,
        draggable: !selectionMode,
        onClick: activate,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        },
        onDragStart: (event: DragEvent) => {
          event.dataTransfer.setData(SERVER_DND_MIME, server.id);
          event.dataTransfer.effectAllowed = "move";
        },
      };

  return {
    creating,
    selectionMode,
    checked,
    toggle: () => toggle(server.id),
    current: selectedServerId === server.id,
    interactive,
  };
}
