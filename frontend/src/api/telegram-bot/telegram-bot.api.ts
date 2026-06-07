import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  BotInfoResponse,
  GenerateOtpResponse,
  LinkedUserResponse,
  OtpValidation,
} from "./telegram-bot.model";

export class TelegramBotApi {
  constructor(private authHttp: AuthHttpClient) {}

  generateOtp = (): Promise<GenerateOtpResponse> =>
    this.authHttp.post<GenerateOtpResponse>("telegram-bot/generate-otp");

  linkTelegram = (otp: string): Promise<OtpValidation> =>
    this.authHttp.post<OtpValidation>("telegram-bot/link-telegram", {
      json: { otp },
    });

  getBotInfo = (): Promise<BotInfoResponse> =>
    this.authHttp.get<BotInfoResponse>("telegram-bot/info");

  getLinkedUsers = (): Promise<LinkedUserResponse[]> =>
    this.authHttp.get<LinkedUserResponse[]>("telegram-bot/linked-users");

  unlinkUser = (telegramId: number): Promise<void> =>
    this.authHttp.post<void>("telegram-bot/unlink-user", {
      json: { telegramId },
    });
}

export const telegramBotApi = new TelegramBotApi(authHttp);
