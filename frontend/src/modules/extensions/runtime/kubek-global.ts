/**
 * window.Kubek is the host surface extension frontend bundles read from. Bundles externalize React
 * and these libraries instead of bundling their own copies, so they share the panel's instances.
 * Installed once, before any bundle is imported
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// The window.Kubek global and its type are declared by @kubekpanel/extension-sdk, this module only populates it

let installed = false;

// ky 2 throws on an empty body, extensions got "" for it before
async function readJson<T>(response: Promise<Response>): Promise<T> {
  const text = await (await response).text();
  return (text ? JSON.parse(text) : "") as T;
}

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
    // Filled by the loader before the first bundle import
    icons: {},
    api,
    // Raw response, no { success, data } envelope - extension handlers return plain JSON via
    // res.json(...). Bearer auth still applies (authKy behind .raw). The enveloped client would
    // treat every raw extension response as a failure
    http: {
      get: <T>(path: string) => readJson<T>(authHttp.raw.get(path)),
      post: <T>(path: string, json?: unknown) =>
        readJson<T>(
          authHttp.raw.post(path, json === undefined ? undefined : { json })
        ),
      delete: <T>(path: string) => readJson<T>(authHttp.raw.delete(path)),
    },
    query: { useQuery, useMutation, useQueryClient },
    hooks: { useAuthStore, useTranslation },
    navigate,
  };
  installed = true;
}
