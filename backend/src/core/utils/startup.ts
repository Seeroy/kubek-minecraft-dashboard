import { Branding } from "@/core/constants/branding";
import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { getErrorMessage } from "@/core/utils/error";
import chalk from "chalk";
import ora, { type Color, type Ora } from "ora";
import * as os from "os";
import { publicIpv4 } from "public-ip";
import { checkForUpdates, getVersion } from "./updates";

type SpinnerType = "webServer" | "publicIP" | "privateIP" | "updates";

// Hard cap for public IP lookup so boot never hangs
const PUBLIC_IP_TIMEOUT_MS = 10_000;

const spinnerPool: Record<SpinnerType, Ora | null> = {
  webServer: null,
  publicIP: null,
  privateIP: null,
  updates: null,
};

export class Startup {
  static latestUpdate: {
    updateAvailable: boolean;
    latestVersion: string;
    releaseNotes?: string;
  } | null = null;
  // Printed after Nest logs so it doesn't get lost among them
  private static defaultAdminPassword: string | null = null;

  /**
   * Show welcome message (banner only)
   */
  static initTerminal() {
    console.clear();
    console.log(" ");
    console.log(
      "    " +
        chalk.bgBlueBright.overline(`${Branding.Name} by ${Branding.Author}`) +
        ` • ${getVersion()}`,
    );
    console.log(" ");
  }

  /**
   * Run the pre-boot intro before the application starts logging
   */
  static async runIntro() {
    // Waiting for IP initialization
    await this.startPrivateIPSpinner();
    await asyncTimeout(100);
    await this.startPublicIPSpinner();
    console.log(" ");
  }

  // Web-server is listening - print the final ready line
  static async serverStarted(port: number) {
    console.log(" ");
    if (this.defaultAdminPassword) {
      console.log("    😎 Default admin user created:");
      console.log("       Username: kubek");
      console.log("       Password: " + this.defaultAdminPassword);
      console.warn(
        "      ",
        chalk.black.bgYellowBright("WARN! Save password!"),
      );
      console.log(" ");
      this.defaultAdminPassword = null;
    }
    this.createSpinner("webServer", " Starting web-server", "white");
    await this.updateSpinnerWithDelay(
      "webServer",
      "success",
      `Started at ${chalk.cyan(`http://localhost:${port}`)}`,
    );
  }

  static setDefaultAdmin(password: string) {
    this.defaultAdminPassword = password;
  }

  /**
   * Set private IP
   */
  static async setPrivateIP(ip: string) {
    await this.updateSpinnerWithDelay(
      "privateIP",
      "success",
      `Local IP: ${ip}`,
    );
  }

  /**
   * Set public IP
   */
  static async setPublicIP(ip: string) {
    await this.updateSpinnerWithDelay(
      "publicIP",
      "success",
      `Public IP: ${ip}`,
    );
  }

  /**
   * Check for updates in the background so boot never waits on the network
   */
  static async checkForUpdates() {
    console.log(" ");
    this.createSpinner("updates", " Checking for updates", "yellow");

    const updatePromise = checkForUpdates();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000),
    );

    try {
      const result = await Promise.race([updatePromise, timeoutPromise]);
      this.latestUpdate = result;
      await this.updateSpinnerWithDelay(
        "updates",
        "success",
        result.updateAvailable
          ? chalk.bgCyan(`Update available: v${result.latestVersion}`)
          : "No updates available",
      );
    } catch (error: unknown) {
      await this.updateSpinnerWithDelay(
        "updates",
        "fail",
        getErrorMessage(error) === "timeout"
          ? "Update check timed out"
          : "Update check failed",
      );
    }
  }

  /**
   * Try to load private IPs info
   * @private
   */
  private static async startPrivateIPSpinner() {
    this.createSpinner("privateIP", " Getting Local IP", "magenta");
    // Fetch network interfaces
    const inets = os.networkInterfaces();

    // Get all IPv4
    const result: string[] = [];
    for (const net of Object.values(inets)) {
      const ipv4 = net?.find((item) => item.family === "IPv4")?.address;
      if (ipv4) result.push(ipv4);
    }

    // Show data
    await this.setPrivateIP(chalk.cyan(result.join(", ")));
    return true;
  }

  /**
   * Try to load public IP info
   * @private
   */
  private static async startPublicIPSpinner() {
    this.createSpinner("publicIP", " Getting Public IP", "cyan");

    // Fetch public IP, lib timeouts are unreliable on Bun so race it
    const abort = new AbortController();
    const request = publicIpv4({
      timeout: 3000,
      onlyHttps: true,
      signal: abort.signal,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("timeout")),
        PUBLIC_IP_TIMEOUT_MS,
      );
    });

    try {
      const ipv4 = await Promise.race([request, timeout]);
      await this.setPublicIP(chalk.cyan(ipv4));
      return true;
    } catch (error: unknown) {
      abort.abort();
      // Writing to stdout here would break the spinner, show failure only
      await this.updateSpinnerWithDelay(
        "publicIP",
        "fail",
        getErrorMessage(error) === "timeout"
          ? "Public IP: timed out"
          : "Public IP: failed",
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Create terminal spinner
   * @param type
   * @param text - message text
   * @param color - background color
   * @private
   */
  private static createSpinner(
    type: SpinnerType,
    text: string,
    color: Color = "cyan",
  ) {
    if (spinnerPool[type]) return;

    spinnerPool[type] = ora({
      text,
      spinner: "dots",
      color,
      prefixText: "   ",
      // Raw stdin mode swallows Ctrl+C and breaks redraws on Bun
      discardStdin: false,
    }).start();
  }

  /**
   * Update terminal spinner
   * @param type
   * @param state - state (success / fail)
   * @param message - message text
   * @private
   */
  private static async updateSpinnerWithDelay(
    type: SpinnerType,
    state: "success" | "fail",
    message?: string,
  ) {
    const spinner = spinnerPool[type];
    if (!spinner) return;

    await asyncTimeout(100);

    if (state === "success") {
      spinner.succeed(chalk.reset(message || spinner.text));
    } else {
      spinner.fail(chalk.red(message || spinner.text));
    }

    await asyncTimeout(100);

    // Clear pool
    spinnerPool[type] = null;
  }
}
