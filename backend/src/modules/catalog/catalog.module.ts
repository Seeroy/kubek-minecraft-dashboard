import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Module({
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
