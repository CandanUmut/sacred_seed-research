declare module 'better-sqlite3' {
  export default class Database {
    constructor(path: string, options?: { readonly?: boolean; fileMustExist?: boolean });
    prepare<T = unknown>(sql: string): {
      run(...params: unknown[]): void;
      get(...params: unknown[]): T | undefined;
      all(...params: unknown[]): T[];
    };
    exec(sql: string): void;
    close(): void;
  }
}
