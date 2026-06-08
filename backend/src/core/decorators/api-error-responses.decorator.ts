import { ApiErrorBodyDto } from "@/core/errors/error-response.dto";
import { applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiResponse } from "@nestjs/swagger";

/**
 * Attaches the standard typed error body to every handler (for api docs)
 */
export function ApiErrorResponses(
  statuses: number[] = [400, 401, 403, 404, 500],
) {
  return applyDecorators(
    ApiExtraModels(ApiErrorBodyDto),
    ...statuses.map((status) => ApiResponse({ status, type: ApiErrorBodyDto })),
  );
}
