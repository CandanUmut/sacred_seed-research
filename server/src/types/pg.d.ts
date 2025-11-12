declare module 'pg' {
  export interface QueryResult<R = unknown> {
    rows: R[];
  }

  export interface QueryConfig {
    text: string;
    values?: unknown[];
  }

  export interface PoolClient {
    query<R = unknown>(queryTextOrConfig: string | QueryConfig, values?: unknown[]): Promise<QueryResult<R>>;
    release(): void;
  }

  export class Pool {
    constructor(config: { connectionString: string });
    connect(): Promise<PoolClient>;
    query<R = unknown>(queryTextOrConfig: string | QueryConfig, values?: unknown[]): Promise<QueryResult<R>>;
  }
}
