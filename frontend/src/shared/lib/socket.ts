import { io, Socket } from "socket.io-client";

// Same-origin by default so it works behind any host/port without a rebuild
const WS_URL_OVERRIDE = process.env.NEXT_PUBLIC_WS_URL?.trim();
const WS_URL =
  WS_URL_OVERRIDE && WS_URL_OVERRIDE.length > 0
    ? WS_URL_OVERRIDE
    : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:8000";

export const createSocket = (token: string): Socket => {
  return io(WS_URL, {
    autoConnect: false,
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
};
