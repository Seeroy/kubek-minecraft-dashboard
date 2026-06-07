import { Injectable } from "@nestjs/common";
import type { QueryProtocol } from "./query-protocol.interface";

/** No online query (not supported game) */
@Injectable()
export class NoneQuery implements QueryProtocol {
  async query(): Promise<null> {
    return null;
  }
}
