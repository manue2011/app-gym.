import type { SQLiteBindValue } from 'expo-sqlite';

/**
 * Subset of expo-sqlite's SQLiteDatabase used by the repositories.
 * Keeping it small lets tests run the same code against an in-memory SQLite in Node.
 */
export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(
    source: string,
    params: SQLiteBindValue[],
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(source: string, params: SQLiteBindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SQLiteBindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const nowIso = () => new Date().toISOString();
