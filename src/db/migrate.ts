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

/**
 * Syncs the built-in catalog by slug: inserts new exercises and refreshes names, media and
 * instructions of existing ones. Custom exercises (slug NULL) are never touched.
 */
export async function seedExercises(db: Db): Promise<void> {
  const createdAt = nowIso();
  await db.withTransactionAsync(async () => {
    for (const e of catalog) {
      await db.runAsync(
        `INSERT INTO exercises
           (slug, name, muscle_primary, muscles_secondary, equipment, gif_path, instructions,
            is_custom, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT (slug) DO UPDATE SET
           name = excluded.name,
           muscle_primary = excluded.muscle_primary,
           muscles_secondary = excluded.muscles_secondary,
           equipment = excluded.equipment,
           gif_path = excluded.gif_path,
           instructions = excluded.instructions`,
        [
          e.slug,
          e.name,
          e.muscle_primary,
          JSON.stringify(e.muscles_secondary),
          e.equipment,
          e.gif_path,
          e.instructions,
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
