import { io, Socket } from "socket.io-client";

// Same-origin by default so it works behind any host/port without a rebuild
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

export const createSocket = (token: string): Socket => {
  return io(WS_URL, {
    autoConnect: false,
    extraHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
};
