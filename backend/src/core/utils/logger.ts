import { ConsoleLogger, LogLevel } from "@nestjs/common";

// debug/verbose only in dev; dist builds (NODE_ENV unset) stay quiet
const DEV = process.env.NODE_ENV === "development";
const LOG_LEVELS: LogLevel[] = DEV
  ? ["error", "warn", "log", "debug", "verbose", "fatal"]
  : ["error", "warn", "log", "fatal"];

export class LoggerAddon extends ConsoleLogger {
  static contextsToIgnore = [
    "InstanceLoader",
    "RoutesResolver",
    "RouterExplorer",
    "NestFactory",
    "WebSocketsController",
    "NestApplication",
  ];

  constructor() {
    super({
      prefix: "Kubek",
      compact: true,
      timestamp: false,
      logLevels: LOG_LEVELS,
    });
  }

  log(_: any, context?: string): void {
    if (!LoggerAddon.contextsToIgnore.includes(context || "")) {
      super.log.apply(this, arguments);
    }
  }
}
