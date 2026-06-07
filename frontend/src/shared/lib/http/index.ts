import { useAuthStore } from "@/shared/stores/auth-store";
import ky from "ky";
import { AuthHttpClient } from "./auth-http-client";
import { BaseHttpClient } from "./base-http-client";

const PREFIX_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : "http://localhost:8000/api");

function getAuthToken(): string | null {
  return useAuthStore.getState().getToken();
}

// Public endpoints (login): no token attached
const baseKy = ky.create({
  prefixUrl: PREFIX_URL,
});

// Authenticated endpoints: attach Bearer token, clear auth on 401
const authKy = ky.create({
  prefixUrl: PREFIX_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getAuthToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401 && getAuthToken()) {
          useAuthStore.getState().clearAuth();
        }
        return response;
      },
    ],
  },
});

export const baseHttp = new BaseHttpClient(baseKy);
export const authHttp = new AuthHttpClient(authKy);

export * from "./query-params";
export * from "./types";
export { AuthHttpClient, BaseHttpClient };

