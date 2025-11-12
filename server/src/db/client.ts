import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Pool, type PoolClient } from 'pg';

export interface SqlClient {
  exec(sql: string, params?: unknown[]): Promise<void>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (client: SqlClient) => Promise<T>): Promise<T>;
}

export function createSqlClient(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url || url.startsWith('sqlite')) {
    return createSqliteClient(url);
  }
  return createPgClient(url);
}

function createSqliteClient(url?: string | null): SqlClient {
  const file = url?.replace('sqlite://', '') ?? path.resolve(process.cwd(), 'var/data/dev.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  const client: SqlClient = {
    async exec(sql: string, params?: unknown[]) {
      if (params?.length) {
        db.prepare(sql).run(...params);
      } else {
        db.exec(sql);
      }
    },
    async get<T>(sql: string, params?: unknown[]) {
      const row = params?.length ? db.prepare(sql).get(...params) : db.prepare(sql).get();
      return (row ?? undefined) as T | undefined;
    },
    async all<T>(sql: string, params?: unknown[]) {
      const rows = params?.length ? db.prepare(sql).all(...params) : db.prepare(sql).all();
      return rows as T[];
    },
    async transaction<T>(fn: (client: SqlClient) => Promise<T>) {
      db.exec('BEGIN');
      try {
        const result = await fn(client);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return client;
}

function createPgClient(url: string): SqlClient {
  const pool = new Pool({ connectionString: url });
  const run = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  };
  const wrap = (client: PoolClient): SqlClient => ({
    async exec(sql: string, params?: unknown[]) {
      const { text, values } = toPg(sql, params);
      await client.query(text, values);
    },
    async get<T>(sql: string, params?: unknown[]) {
      const { text, values } = toPg(sql, params);
      const { rows } = await client.query(text, values);
      return (rows[0] ?? undefined) as T | undefined;
    },
    async all<T>(sql: string, params?: unknown[]) {
      const { text, values } = toPg(sql, params);
      const { rows } = await client.query(text, values);
      return rows as T[];
    },
    async transaction<T>(fn: (client: SqlClient) => Promise<T>) {
      await client.query('BEGIN');
      try {
        const result = await fn(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    },
  });
  return {
    async exec(sql: string, params?: unknown[]) {
      await run((client) => {
        const { text, values } = toPg(sql, params);
        return client.query(text, values);
      });
    },
    async get<T>(sql: string, params?: unknown[]) {
      const { rows } = await run((client) => {
        const { text, values } = toPg(sql, params);
        return client.query(text, values);
      });
      return (rows[0] ?? undefined) as T | undefined;
    },
    async all<T>(sql: string, params?: unknown[]) {
      const { rows } = await run((client) => {
        const { text, values } = toPg(sql, params);
        return client.query(text, values);
      });
      return rows as T[];
    },
    async transaction<T>(fn: (client: SqlClient) => Promise<T>) {
      return run(async (client) => {
        const wrapped = wrap(client);
        return wrapped.transaction(fn);
      });
    },
  };
}

function toPg(sql: string, params?: unknown[]): { text: string; values: unknown[] | undefined } {
  if (!params || params.length === 0) return { text: sql, values: params };
  let index = 0;
  const text = sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
  return { text, values: params };
}
