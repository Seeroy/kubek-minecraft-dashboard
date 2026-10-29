import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { NotificationPrefs, NotificationsPage } from "@shared/types/notification.types";

export interface NotificationsListParams {
  cursor?: string;
  unread?: boolean;
  limit?: number;
}

export class NotificationsApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = ({ cursor, unread, limit }: NotificationsListParams = {}): Promise<NotificationsPage> => {
    const searchParams = new URLSearchParams();
    if (cursor) searchParams.set("cursor", cursor);
    if (unread) searchParams.set("unread", "true");
    if (limit) searchParams.set("limit", String(limit));
    return this.authHttp.get<NotificationsPage>("notifications", { searchParams });
  };

  markRead = async (id: string): Promise<void> => {
    await this.authHttp.post<void>(`notifications/${id}/read`);
  };

  markAllRead = async (): Promise<void> => {
    await this.authHttp.post<void>("notifications/read-all");
  };

  remove = async (id: string): Promise<void> => {
    await this.authHttp.delete<void>(`notifications/${id}`);
  };

  getPrefs = async (): Promise<NotificationPrefs> => (await this.authHttp.get<{ prefs: NotificationPrefs }>("notifications/prefs")).prefs;

  setPrefs = async (prefs: NotificationPrefs): Promise<NotificationPrefs> =>
    (await this.authHttp.put<{ prefs: NotificationPrefs }>("notifications/prefs", { json: { prefs } })).prefs;
}

export const notificationsApi = new NotificationsApi(authHttp);
