import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { initDatabase } from '../migrate';
import type { Db } from '../types';

type Params = Parameters<Db['runAsync']>[1];

const toInput = (params: Params) =>
  params.map((p) => (typeof p === 'boolean' ? Number(p) : p) as SQLInputValue);

/** In-memory SQLite (Node's built-in driver) behind the same interface as expo-sqlite. */
export async function createTestDb(): Promise<Db & { raw: DatabaseSync }> {
  const raw = new DatabaseSync(':memory:');
  const db = {
    raw,
    async execAsync(source: string) {
      raw.exec(source);
    },
    async runAsync(source: string, params: Params) {
      const res = raw.prepare(source).run(...toInput(params));
      return { lastInsertRowId: Number(res.lastInsertRowid), changes: Number(res.changes) };
    },
    async getFirstAsync<T>(source: string, params: Params) {
      const row = raw.prepare(source).get(...toInput(params));
      return row ? ({ ...row } as T) : null;
    },
    async getAllAsync<T>(source: string, params: Params) {
      return raw
        .prepare(source)
        .all(...toInput(params))
        .map((r) => ({ ...r }) as T);
    },
    async withTransactionAsync(task: () => Promise<void>) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  await initDatabase(db);
  return db;
}
