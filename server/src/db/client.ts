import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import pg from 'pg';

const { Pool } = pg;
type PoolClient = pg.PoolClient;

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
  return {
    async exec(sql, params) {
      if (params?.length) {
        db.prepare(sql).run(...params);
      } else {
        db.exec(sql);
      }
    },
    async get(sql, params) {
      return params?.length ? db.prepare(sql).get(...params) : db.prepare(sql).get();
    },
    async all(sql, params) {
      return params?.length ? db.prepare(sql).all(...params) : db.prepare(sql).all();
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        const result = await fn(this);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
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
    async exec(sql, params) {
      const { text, values } = toPg(sql, params);
      await client.query(text, values);
    },
    async get(sql, params) {
      const { text, values } = toPg(sql, params);
      const { rows } = await client.query(text, values);
      return rows[0];
    },
    async all(sql, params) {
      const { text, values } = toPg(sql, params);
      const { rows } = await client.query(text, values);
      return rows;
    },
    async transaction(fn) {
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
    async exec(sql, params) {
      await run((client) => {
        const { text, values } = toPg(sql, params);
        return client.query(text, values);
      });
    },
    async get(sql, params) {
      const { rows } = await run((client) => {
        const { text, values } = toPg(sql, params);
        return client.query(text, values);
      });
      return rows[0];
    },
    async all(sql, params) {
      const { rows } = await run((client) => {
        const { text, values } = toPg(sql, params);
        return client.query(text, values);
      });
      return rows;
    },
    async transaction(fn) {
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
