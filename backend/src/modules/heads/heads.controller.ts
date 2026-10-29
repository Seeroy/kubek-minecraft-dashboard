import { Public } from "@/modules/auth/decorators/public.decorator";
import { Controller, Get, Headers, Param, Res } from "@nestjs/common";
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { HeadsService } from "./heads.service";

@ApiTags("Heads")
@Controller("api/heads")
export class HeadsController {
  constructor(private readonly heads: HeadsService) {}

  /**
   * Player head avatar
   * Public so it works as a plain img src, skins are public anyway
   */
  @Get(":name")
  @Public()
  @ApiOperation({ summary: "Get a Minecraft player head as an 8x8 PNG" })
  @ApiParam({ name: "name", description: "Minecraft player name" })
  @ApiHeader({
    name: "if-none-match",
    required: false,
    description: "ETag from a previous response",
  })
  @ApiProduces("image/png")
  @ApiResponse({ status: 200, description: "Head image" })
  @ApiResponse({ status: 304, description: "Not modified" })
  @ApiResponse({ status: 404, description: "No skin for this name" })
  async getHead(
    @Param("name") name: string,
    @Headers("if-none-match") ifNoneMatch: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const head = this.heads.isValidName(name)
      ? await this.heads.getHead(name)
      : null;

    if (!head) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(404).end();
      return;
    }

    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800",
    );
    res.setHeader("ETag", head.etag);
    if (ifNoneMatch === head.etag) {
      res.status(304).end();
      return;
    }
    res.type("image/png").send(head.png);
  }
}
