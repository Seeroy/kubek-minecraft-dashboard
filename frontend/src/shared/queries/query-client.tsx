"use client";

import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { ApiError } from "@/shared/lib/http";
import { emitToast } from "@/shared/lib/toast-bus";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

function shouldShowError(meta: Record<string, unknown> | undefined): boolean {
  return !meta || meta.silent !== true;
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => !isUnauthorized(err) && count < 2,
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (err, query) => {
        if (isUnauthorized(err)) return;
        if (!shouldShowError(query.meta)) return;
        emitToast({ title: getApiErrorMessage(err), type: "error" });
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        if (isUnauthorized(err)) return;
        if (!shouldShowError(mutation.meta)) return;
        emitToast({ title: getApiErrorMessage(err), type: "error" });
      },
    }),
  });
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
