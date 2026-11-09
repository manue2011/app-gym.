import catalog from '../data/exercises.json';
import { migrations } from './migrations';
import { nowIso, type Db } from './types';

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  for (const m of migrations) {
    if (m.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.sql);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
  }
}

/** Inserts catalog exercises that are not in the database yet (matched by slug). */
export async function seedExercises(db: Db): Promise<void> {
  const createdAt = nowIso();
  await db.withTransactionAsync(async () => {
    for (const e of catalog) {
      await db.runAsync(
        `INSERT OR IGNORE INTO exercises
           (slug, name, muscle_primary, muscles_secondary, equipment, is_custom, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [
          e.slug,
          e.name,
          e.muscle_primary,
          JSON.stringify(e.muscles_secondary),
          e.equipment,
          createdAt,
        ],
      );
    }
  });
}

/** Runs on every app start, before any screen renders. */
export async function initDatabase(db: Db): Promise<void> {
  // Per-connection setting: must run outside a transaction, every time the DB opens.
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await migrate(db);
  await seedExercises(db);
}
