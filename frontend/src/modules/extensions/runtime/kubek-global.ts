/**
 * window.Kubek is the host surface extension frontend bundles read from. Bundles externalize React
 * and these libraries instead of bundling their own copies, so they share the panel's instances.
 * Installed once, before any bundle is imported
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import * as React from "react";

import { api } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { authHttp } from "@/shared/lib/http";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";

export interface KubekRuntime {
  React: typeof React;
  ui: {
    Button: typeof Button;
    Input: typeof Input;
    Label: typeof Label;
    Badge: typeof Badge;
    Separator: typeof Separator;
    Card: typeof Card;
    CardContent: typeof CardContent;
    CardHeader: typeof CardHeader;
    CardTitle: typeof CardTitle;
  };
  icons: typeof Icons;
  api: typeof api;
  /** call panel/extension endpoints with the user's token (paths relative to /api) */
  http: {
    get: <T>(path: string) => Promise<T>;
    post: <T>(path: string, json?: unknown) => Promise<T>;
    delete: <T>(path: string) => Promise<T>;
  };
  query: {
    useQuery: typeof useQuery;
    useMutation: typeof useMutation;
    useQueryClient: typeof useQueryClient;
  };
  hooks: {
    useAuthStore: typeof useAuthStore;
    useTranslation: typeof useTranslation;
  };
  /** set by ExtensionRuntimeProvider so extensions can route within the panel */
  navigate: (path: string) => void;
}

// The window.Kubek global is declared by @kubekpanel/extension-sdk (so extension authors get it too);
// this module only populates it. KubekRuntime above is the host's concrete view of the same surface

let installed = false;

export function installKubekGlobal(navigate: (path: string) => void): void {
  if (typeof window === "undefined") return;
  if (installed && window.Kubek) {
    window.Kubek.navigate = navigate;
    return;
  }
  window.Kubek = {
    React,
    ui: {
      Button,
      Input,
      Label,
      Badge,
      Separator,
      Card,
      CardContent,
      CardHeader,
      CardTitle,
    },
    icons: Icons,
    api,
    // Raw response, no { success, data } envelope - extension handlers return plain JSON via
    // res.json(...). Bearer auth still applies (authKy behind .raw). The enveloped client would
    // treat every raw extension response as a failure
    http: {
      get: <T>(path: string) => authHttp.raw.get(path).json<T>(),
      post: <T>(path: string, json?: unknown) =>
        authHttp.raw
          .post(path, json === undefined ? undefined : { json })
          .json<T>(),
      delete: <T>(path: string) => authHttp.raw.delete(path).json<T>(),
    },
    query: { useQuery, useMutation, useQueryClient },
    hooks: { useAuthStore, useTranslation },
    navigate,
  };
  installed = true;
}
