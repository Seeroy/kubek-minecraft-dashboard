import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  UpdatePreferencesDto,
  UserPreferences,
} from "./preferences.model";

/** User preferences: 2FA method, dashboard layout, skin, what's new */
export class PreferencesApi {
  constructor(private authHttp: AuthHttpClient) {}

  get = (): Promise<UserPreferences> =>
    this.authHttp.get<UserPreferences>("accounts/me/preferences");

  update = (data: UpdatePreferencesDto): Promise<UserPreferences> =>
    this.authHttp.patch<UserPreferences>("accounts/me/preferences", {
      json: data,
    });
}

export const preferencesApi = new PreferencesApi(authHttp);
