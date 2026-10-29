import { useAuthStore } from "@/shared/stores/auth-store";
import ky from "ky";
import { API_URL } from "./api-url";
import { AuthHttpClient } from "./auth-http-client";
import { BaseHttpClient } from "./base-http-client";

function getAuthToken(): string | null {
  return useAuthStore.getState().getToken();
}

// only the guard's 401 means the session is gone, other 401s carry their own code
async function isSessionGone(response: Response): Promise<boolean> {
  try {
    const body = (await response.clone().json()) as { code?: unknown };
    return !body.code || body.code === "UNAUTHORIZED";
  } catch {
    return true;
  }
}

// Public endpoints (login): no token attached
const baseKy = ky.create({
  prefix: API_URL,
});

// Authenticated endpoints: attach Bearer token, clear auth when the session is rejected
const authKy = ky.create({
  prefix: API_URL,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = getAuthToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ response }) => {
        if (response.status !== 401 || !getAuthToken()) return;
        if (await isSessionGone(response)) useAuthStore.getState().clearAuth();
      },
    ],
  },
});

export const baseHttp = new BaseHttpClient(baseKy);
export const authHttp = new AuthHttpClient(authKy);

export { API_URL } from "./api-url";
export * from "./query-params";
export * from "./types";
export { AuthHttpClient, BaseHttpClient };
