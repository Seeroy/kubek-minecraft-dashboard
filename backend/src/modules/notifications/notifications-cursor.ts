import { BadRequestException } from "@nestjs/common";
import type { NotificationCursor } from "@/modules/database/repositories/notifications.repository";

export function encodeCursor(item: NotificationCursor): string {
  return Buffer.from(`${item.createdAt}:${item.id}`).toString("base64url");
}

export function decodeCursor(cursor: string): NotificationCursor {
  const [createdAt, id] = Buffer.from(cursor, "base64url")
    .toString()
    .split(":");
  if (!id || !Number.isFinite(Number(createdAt))) {
    throw new BadRequestException("Invalid cursor");
  }
  return { createdAt: Number(createdAt), id };
}
