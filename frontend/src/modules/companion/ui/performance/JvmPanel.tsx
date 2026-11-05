"use client";

import type { CompanionLive } from "@/api";
import { formatDuration } from "@/shared/lib/formatDuration";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { Panel, PanelBody, PanelHead, PanelTitle } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Coffee } from "lucide-react";

/** Server software, Java and where the numbers come from */
export function JvmPanel({ live }: { live: CompanionLive }) {
  const { t } = useTranslation("modules.companion.performance.jvm");
  const { t: tComponents } = useTranslation("modules.components");
  const hello = live.hello;
  const jvm = live.stats?.jvm;

  return (
    <Panel>
      <PanelHead>
        <Plate tone="orange" size="sm">
          <Coffee />
        </Plate>
        <PanelTitle>{t("title")}</PanelTitle>
      </PanelHead>
      <PanelBody>
        <KeyValue>
          {hello && (
            <>
              <KeyValueItem label={t("server")}>
                <span title={hello.server.version}>
                  {hello.server.name} {hello.server.bukkitVersion.split("-")[0]}
                </span>
              </KeyValueItem>
              <KeyValueItem label={t("java")}>
                <span title={`${hello.java.vendor}, ${hello.java.vm}`}>{hello.java.version}</span>
              </KeyValueItem>
              <KeyValueItem label={t("plugin")}>{hello.plugin}</KeyValueItem>
              <KeyValueItem label={t("tpsSource")}>{t(`sources.tps.${hello.caps.tps}`)}</KeyValueItem>
              <KeyValueItem label={t("msptSource")}>{t(`sources.mspt.${hello.caps.mspt}`)}</KeyValueItem>
            </>
          )}
          {jvm && (
            <>
              <KeyValueItem label={t("committed")}>{formatBytes(jvm.heapCommitted)}</KeyValueItem>
              <KeyValueItem label={t("nonHeap")}>{formatBytes(jvm.nonHeapUsed)}</KeyValueItem>
              <KeyValueItem label={t("threads")}>{t("threadsValue", jvm.threads, jvm.daemonThreads)}</KeyValueItem>
              <KeyValueItem label={t("uptime")}>{formatDuration(jvm.uptime / 1000, tComponents)}</KeyValueItem>
            </>
          )}
        </KeyValue>
      </PanelBody>
    </Panel>
  );
}
