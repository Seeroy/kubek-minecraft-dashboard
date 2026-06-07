import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "../src/app.module";

/**
 * Emit the OpenAPI document to a static file without booting the server
 *
 * Run: `npm run openapi:json` → writes backend/openapi.json
 * Then regenerate the frontend types:
 *   npx openapi-typescript backend/openapi.json -o frontend/src/api/types.ts
 */
async function main() {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });

  const config = new DocumentBuilder()
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

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });

  const out = resolve(__dirname, "../openapi.json");
  writeFileSync(out, JSON.stringify(document, null, 2));
  await app.close();

  // eslint-disable-next-line no-console
  console.log(`OpenAPI document written to ${out}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
