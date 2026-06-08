import { ConsoleLogger } from "@nestjs/common";

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
    });
  }

  log(_: any, context?: string): void {
    if (!LoggerAddon.contextsToIgnore.includes(context || "")) {
      super.log.apply(this, arguments);
    }
  }
}
