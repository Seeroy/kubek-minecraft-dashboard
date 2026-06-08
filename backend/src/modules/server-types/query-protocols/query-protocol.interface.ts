/** Normalized result of an online/players query */
export interface QueryResult {
  players: { max?: number; online?: number; list?: string[] };
  version?: string;
}

/** Pluggable query adapter, selected by blueprint.query.protocol */
export interface QueryProtocol {
  query(opts: { host: string; port: number }): Promise<QueryResult | null>;
}
