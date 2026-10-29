import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  Account,
  ChangePasswordDto,
  CreateAccountDto,
  FtpPasswordResponse,
  UpdateAccountDto,
} from "./accounts.model";

export class AccountsApi {
  constructor(private authHttp: AuthHttpClient) {}

  getAllAccounts = (): Promise<Account[]> =>
    this.authHttp.get<Account[]>("accounts");

  createAccount = (data: CreateAccountDto): Promise<void> =>
    this.authHttp.post<void>("accounts", { json: data });

  getAccount = (username: string): Promise<Account> =>
    this.authHttp.get<Account>(`accounts/${username}`);

  updateAccount = (username: string, data: UpdateAccountDto): Promise<void> =>
    this.authHttp.put<void>(`accounts/${username}`, { json: data });

  deleteAccount = (username: string): Promise<void> =>
    this.authHttp.delete<void>(`accounts/${username}`);

  changePassword = (username: string, data: ChangePasswordDto): Promise<void> =>
    this.authHttp.post<void>(`accounts/${username}/change-password`, {
      json: data,
    });

  revealOwnFtpPassword = (): Promise<FtpPasswordResponse> =>
    this.authHttp.get<FtpPasswordResponse>("accounts/me/ftp-password");

  issueOwnFtpPassword = (): Promise<FtpPasswordResponse> =>
    this.authHttp.post<FtpPasswordResponse>("accounts/me/ftp-password");

  resetFtpPassword = (username: string): Promise<FtpPasswordResponse> =>
    this.authHttp.post<FtpPasswordResponse>(`accounts/${username}/ftp-password`);

  removeFtpPassword = (username: string): Promise<void> =>
    this.authHttp.delete<void>(`accounts/${username}/ftp-password`);
}

export const accountsApi = new AccountsApi(authHttp);
