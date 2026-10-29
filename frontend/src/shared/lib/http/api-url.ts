const API_URL_OVERRIDE = process.env.NEXT_PUBLIC_API_URL?.trim();
export const API_URL =
  API_URL_OVERRIDE && API_URL_OVERRIDE.length > 0
    ? API_URL_OVERRIDE
    : typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "http://localhost:8000/api";

