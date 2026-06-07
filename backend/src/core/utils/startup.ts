import { asyncTimeout } from "@/core/utils/asyncTimeout";
import { getErrorMessage } from "@/core/utils/error";
import { Branding } from "@/core/constants/branding";
import chalk from "chalk";
import ora, { type Color, type Ora } from "ora";
import * as os from "os";
import { publicIpv4 } from "public-ip";
import { checkForUpdates, getVersion } from "./updates";

type SpinnerType = "webServer" | "publicIP" | "privateIP" | "updates";

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
  /**
   * Show welcome message
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

    // Waiting for web-server
    this.createSpinner("webServer", " Starting web-server", "white");
  }

  // Web-server started successfully
  static async webServerStarted(port: number) {
    await this.updateSpinnerWithDelay(
      "webServer",
      "success",
      `Started at ${chalk.cyan(`http://localhost:${port}`)}`,
    );

    // Check for updates
    await this.checkForUpdates();

    // Waiting for IP initialization
    await this.startPrivateIPSpinner();
    await asyncTimeout(100);
    await this.startPublicIPSpinner();
    console.log(" ");
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
   * Check for updates
   * @private
   */
  private static async checkForUpdates() {
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

    try {
      // Fetch public IP
      const ipv4 = await publicIpv4({ timeout: 2000, onlyHttps: true });
      await this.setPublicIP(chalk.cyan(ipv4));
      return true;
    } catch (e) {
      console.error(e);
      // Show failure (timeout or error)
      await this.setPublicIP("Failed");
      return false;
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
