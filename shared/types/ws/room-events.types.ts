// Client to server, payload is a room name like "server:<id>"
export enum WsRoomEventTypes {
  ROOM_SUBSCRIBE = "room:subscribe",
  ROOM_UNSUBSCRIBE = "room:unsubscribe",
}

/** Ack of a subscribe or unsubscribe, false when the room is not allowed */
export interface WsRoomAck {
  ok: boolean;
}

export const serverRoom = (serverId: string) => `server:${serverId}`;

/** Joined with the server room when the account may read the console */
export const consoleRoom = (serverId: string) => `console:${serverId}`;
