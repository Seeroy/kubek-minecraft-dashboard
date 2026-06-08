"use client";
import { createSocket } from "@/shared/lib/socket";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { WsEventPayloadMap } from "@shared/types/ws/event-payload-map.types";
import { WsUserEventTypes } from "@shared/types/ws/user-events.types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { Socket } from "socket.io-client";

type SocketStatus = "disconnected" | "connecting" | "connected" | "error";

// Stable API: subscribe/unsubscribe/connect/disconnect never change identity
interface SocketApiValue {
  connect: () => void;
  disconnect: () => void;
  getSocket: () => Socket | null;
  subscribe<E extends keyof WsEventPayloadMap>(
    event: E,
    handler: (data: WsEventPayloadMap[E]) => void
  ): void;
  subscribe(event: string, handler: (...args: any[]) => void): void;
  unsubscribe<E extends keyof WsEventPayloadMap>(
    event: E,
    handler?: (data: WsEventPayloadMap[E]) => void
  ): void;
  unsubscribe(event: string, handler?: (...args: any[]) => void): void;
}

// Reactive state: changes on (re)connect and status transitions
interface SocketStateValue {
  socket: Socket | null;
  status: SocketStatus;
}

const SocketApiContext = createContext<SocketApiValue | undefined>(undefined);
const SocketStateContext = createContext<SocketStateValue | undefined>(
  undefined
);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [status, setStatus] = React.useState<SocketStatus>("disconnected");

  // Buffer for event handlers so they survive socket recreation
  const handlersRef = useRef<Map<string, ((...args: any[]) => void)[]>>(
    new Map()
  );
  const socketRef = useRef<Socket | null>(null);

  // Reactively follow the auth token
  const token = useAuthStore((s) => s.token);

  const connect = useCallback((nextToken: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = createSocket(nextToken);
    socketRef.current = newSocket;
    setSocket(newSocket);
    setStatus("connecting");

    const handleConnect = () => setStatus("connected");
    const handleDisconnect = () => setStatus("disconnected");
    const handleConnectError = () => setStatus("error");
    // Server revoked the session / token is invalid: clear auth
    const handleAuthFailed = () => {
      useAuthStore.getState().clearAuth();
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("connect_error", handleConnectError);
    newSocket.on(WsUserEventTypes.AUTH_FAILED, handleAuthFailed);

    // Replay every buffered handler on the new socket
    handlersRef.current.forEach((handlers, event) => {
      handlers.forEach((handler) => newSocket.on(event, handler));
    });

    newSocket.connect();

    return () => {
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.off("connect_error", handleConnectError);
      newSocket.off(WsUserEventTypes.AUTH_FAILED, handleAuthFailed);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setStatus("disconnected");
    }
  }, []);

  const subscribe = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, []);
      }
      handlersRef.current.get(event)!.push(handler);

      socketRef.current?.on(event, handler);
    },
    []
  );

  const unsubscribe = useCallback(
    (event: string, handler?: (...args: any[]) => void) => {
      if (handler) {
        const handlers = handlersRef.current.get(event);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) handlers.splice(index, 1);
          if (handlers.length === 0) handlersRef.current.delete(event);
        }
        socketRef.current?.off(event, handler);
      } else {
        handlersRef.current.delete(event);
        socketRef.current?.off(event);
      }
    },
    []
  );

  // (Re)connect whenever the token changes; tear down on logout
  useEffect(() => {
    if (!token) {
      disconnect();
      return;
    }

    const cleanup = connect(token);
    return () => {
      cleanup?.();
    };
  }, [token, connect, disconnect]);

  // Imperative connect kept for backward-compatibility (callers that just want
  // to ensure the socket is up). It uses the latest token from the store
  const imperativeConnect = useCallback(() => {
    const current = useAuthStore.getState().getToken();
    if (!current) return;
    connect(current);
  }, [connect]);

  const getSocket = useCallback(() => socketRef.current, []);

  const apiValue = useMemo<SocketApiValue>(
    () => ({
      connect: imperativeConnect,
      disconnect,
      getSocket,
      subscribe,
      unsubscribe,
    }),
    [imperativeConnect, disconnect, getSocket, subscribe, unsubscribe]
  );

  const stateValue = useMemo<SocketStateValue>(
    () => ({ socket, status }),
    [socket, status]
  );

  return (
    <SocketApiContext.Provider value={apiValue}>
      <SocketStateContext.Provider value={stateValue}>
        {children}
      </SocketStateContext.Provider>
    </SocketApiContext.Provider>
  );
}

/** Stable socket API (subscribe/unsubscribe/connect/disconnect). Does not re-render on status */
export function useSocketApi(): SocketApiValue {
  const context = useContext(SocketApiContext);
  if (context === undefined) {
    throw new Error("useSocketApi must be used within a SocketProvider");
  }
  return context;
}

/** Reactive socket state (socket instance + connection status) */
export function useSocketState(): SocketStateValue {
  const context = useContext(SocketStateContext);
  if (context === undefined) {
    throw new Error("useSocketState must be used within a SocketProvider");
  }
  return context;
}

/** Backward-compatible merged hook. Re-renders on status changes - prefer useSocketApi when you only subscribe */
export function useSocketStore(): SocketApiValue & SocketStateValue {
  return { ...useSocketApi(), ...useSocketState() };
}
