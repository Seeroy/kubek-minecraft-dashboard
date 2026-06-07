"use client";
import { api } from "@/api";
import { useServerStatus, useServerStore } from "@/modules/server";
import QueryGrid from "@/modules/sidebar/ui/QueryGrid";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { TooltipButton } from "@/shared/ui/TooltipButton";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical, OctagonX, Play, RotateCw, Square } from "lucide-react";
import { useState } from "react";

// Shared easing for crossfades + height settling
const EASE = [0.22, 1, 0.36, 1] as const;
const swapVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};
const swapTransition = { duration: 0.22, ease: EASE };

const ServerControls = () => {
  const { selectedServer } = useServerStore();
  const serverStatus = useServerStatus(selectedServer?.id)?.status;
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation("modules.sidebar.serverControls");

  const isLive = serverStatus === "running" || serverStatus === "starting";
  const isStopped = serverStatus === "stopped" || !serverStatus;

  const run = async (action: () => Promise<unknown>, label: string) => {
    if (!selectedServer || isLoading) return;
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      console.error(`Failed to ${label} server:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () =>
    run(() => api.servers.start(selectedServer!.id), "start");
  const handleStop = () =>
    run(() => api.servers.stop(selectedServer!.id), "stop");
  const handleRestart = () =>
    run(() => api.servers.restart(selectedServer!.id), "restart");
  const handleKill = () =>
    run(() => api.servers.kill(selectedServer!.id), "kill");

  return (
    <motion.div layout transition={{ layout: { duration: 0.3, ease: EASE } }}>
      <AnimatePresence mode="wait" initial={false}>
        {!selectedServer ? (
          <motion.div
            key="empty"
            variants={swapVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={swapTransition}
            className="px-3 py-3 text-center text-xs text-muted-foreground"
          >
            {t("noServerSelected")}
          </motion.div>
        ) : (
          <motion.div
            key="controls"
            variants={swapVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={swapTransition}
            className="space-y-2.5 p-3"
          >
            {/* Live status strip (status dot, players, uptime) */}
            <QueryGrid />

            <div className="flex items-center gap-1.5">
              {/* Primary action toggles with run state */}
              {isLive ? (
                <Button
                  variant="ghost"
                  onClick={handleStop}
                  disabled={isLoading}
                  className="flex-1 gap-1.5 bg-[oklch(0.77_0.15_70/0.12)] text-[oklch(0.55_0.13_70)] hover:bg-[oklch(0.77_0.15_70/0.20)] dark:text-[oklch(0.82_0.16_70)]"
                >
                  <Square className="h-4 w-4" />
                  {t("stop")}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleStart}
                  disabled={isLoading || serverStatus === "stopping"}
                  className="flex-1 gap-1.5 bg-[oklch(0.77_0.17_140/0.12)] text-[oklch(0.55_0.17_140)] hover:bg-[oklch(0.77_0.17_140/0.20)] dark:text-[oklch(0.80_0.18_140)]"
                >
                  <Play className="h-4 w-4" />
                  {t("start")}
                </Button>
              )}

              <TooltipButton
                size="icon"
                variant="ghost"
                className="bg-[oklch(0.70_0.15_220/0.12)] text-[oklch(0.50_0.13_220)] hover:bg-[oklch(0.70_0.15_220/0.20)] dark:text-[oklch(0.80_0.15_220)]"
                tooltipContent={t("restartServer")}
                onClick={handleRestart}
                disabled={
                  isLoading ||
                  serverStatus === "stopped" ||
                  serverStatus === "stopping"
                }
              >
                <RotateCw className="h-4 w-4" />
              </TooltipButton>

              {/* Destructive / rarely-used action tucked behind an overflow menu */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("moreActions")}
                      className="text-muted-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" side="top" className="w-60">
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isLoading || isStopped}
                    onClick={handleKill}
                  >
                    <OctagonX />
                    <div className="flex flex-col">
                      <span>{t("forceStop")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("immediateShutdown")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ServerControls;
