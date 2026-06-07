/**
 * Raw REST error body returned by the backend on any failed request
 */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  requestId: string;
  path: string;
  details?: { field: string; message: string }[];
  attemptsLeft?: number;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly timestamp: string;
  public readonly requestId: string;
  public readonly path: string;
  public readonly details?: { field: string; message: string }[];
  public readonly attemptsLeft?: number;

  constructor(error: ApiErrorBody) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = error.statusCode;
    this.timestamp = error.timestamp;
    this.requestId = error.requestId;
    this.path = error.path;
    this.details = error.details;
    this.attemptsLeft = error.attemptsLeft;
  }
}
