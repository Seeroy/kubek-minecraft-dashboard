import { BadResponseFilter } from "@/core/middlewares/badResponseFilter";
import { validationPipe } from "@/core/middlewares/validationPipe";
import { readPortBeforeNestInit } from "@/core/utils/configEarly";
import { LoggerAddon } from "@/core/utils/logger";
import { Startup } from "@/core/utils/startup";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { AppModule } from "./app.module";

// Handle all exceptions and rejections (globally)
process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught exception:", error);
});

async function bootstrap() {
  Startup.initTerminal();

  // Port must be read before Nest init so listen() can use it
  const configuredPort = readPortBeforeNestInit();

  const app = await NestFactory.create(AppModule, {
    logger: new LoggerAddon(),
  });

  app.useGlobalFilters(new BadResponseFilter());
  app.useGlobalPipes(validationPipe);

  if (process.env.NODE_ENV === "development") {
    const docConfig = new DocumentBuilder()
      .setTitle("Kubek - Minecraft Server Management")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Secret",
          description: "Enter secret token",
        },
        "access-token",
      )
      .build();

    const document = SwaggerModule.createDocument(app, docConfig, {
      ignoreGlobalPrefix: true,
    });

    SwaggerModule.setup("/api/docs", app, document, {
      jsonDocumentUrl: "/api/docs-json",
      swaggerOptions: { persistAuthorization: true },
    });

    app.use(
      "/api/reference",
      apiReference({
        url: "/api/docs-json",
        theme: "default",
        layout: "modern",
        authentication: {
          preferredSecurityScheme: "httpBearer",
        },
      }),
    );
  }

  app.enableCors();

  await app.listen(process.env.PORT ?? configuredPort);
  await Startup.webServerStarted(configuredPort);
}

bootstrap();
