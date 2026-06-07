"use client";

import { Loader2 } from "lucide-react";
import type { ComponentType } from "react";
import { createElement, useEffect, useState } from "react";
import { loadExtensionComponent } from "../runtime/loader";

interface Props {
  bundleUrl: string;
  /** name of the component exported by the extension's KubekFrontendModule */
  name: string;
  /** props forwarded to the extension component */
  props?: Record<string, unknown>;
}

/** Lazily imports and renders a single extension component, guarding load failures */
export const DynamicExtensionComponent = ({
  bundleUrl,
  name,
  props,
}: Props) => {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setComponent(null);
    setError(null);
    loadExtensionComponent(bundleUrl, name)
      .then((c) => alive && setComponent(() => c))
      .catch(
        (e) => alive && setError(e instanceof Error ? e.message : String(e))
      );
    return () => {
      alive = false;
    };
  }, [bundleUrl, name]);

  if (error)
    return (
      <div className="text-xs text-destructive">Extension error: {error}</div>
    );
  if (!Component) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
      </div>
    );
  }
  return createElement(Component, props ?? {});
};
