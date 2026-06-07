import { ApiErrorResponses } from "@/core/decorators/api-error-responses.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { PermissionDescriptorDto } from "./dto/permission-descriptor.dto";
import { PermissionRegistry } from "./permission-registry.service";

@ApiTags("Permissions")
@ApiBearerAuth()
@Controller("api/permissions")
@UseGuards(BearerAuthGuard)
export class PermissionsController {
  constructor(private readonly registry: PermissionRegistry) {}

  @Get()
  @ApiOperation({
    summary: "List all grantable permissions (core + extensions)",
  })
  @ApiOkResponse({ type: [PermissionDescriptorDto] })
  @ApiErrorResponses([401])
  list(): PermissionDescriptorDto[] {
    return this.registry.list();
  }
}
