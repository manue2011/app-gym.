import { nowIso, type Db } from '../types';

export interface Exercise {
  id: number;
  /** Stable key of built-in exercises; null for custom ones. */
  slug: string | null;
  name: string;
  muscle_primary: string;
  muscles_secondary: string[];
  equipment: string | null;
  gif_path: string | null;
  instructions: string | null;
  common_mistakes: string | null;
  is_custom: boolean;
}

type ExerciseRow = Omit<Exercise, 'muscles_secondary' | 'is_custom'> & {
  muscles_secondary: string;
  is_custom: number;
};

const toExercise = (r: ExerciseRow): Exercise => ({
  ...r,
  muscles_secondary: JSON.parse(r.muscles_secondary) as string[],
  is_custom: r.is_custom === 1,
});

const COLUMNS = `id, slug, name, muscle_primary, muscles_secondary, equipment, gif_path,
  instructions, common_mistakes, is_custom`;

export async function listExercises(db: Db, muscle?: string): Promise<Exercise[]> {
  const rows = muscle
    ? await db.getAllAsync<ExerciseRow>(
        `SELECT ${COLUMNS} FROM exercises WHERE muscle_primary = ? ORDER BY name`,
        [muscle],
      )
    : await db.getAllAsync<ExerciseRow>(
        `SELECT ${COLUMNS} FROM exercises ORDER BY muscle_primary, name`,
        [],
      );
  return rows.map(toExercise);
}

export async function getExercise(db: Db, id: number): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>(`SELECT ${COLUMNS} FROM exercises WHERE id = ?`, [
    id,
  ]);
  return row ? toExercise(row) : null;
}

export interface NewCustomExercise {
  name: string;
  muscle_primary: string;
  muscles_secondary?: string[];
  equipment?: string | null;
  instructions?: string | null;
}

export async function createCustomExercise(db: Db, input: NewCustomExercise): Promise<number> {
  const name = input.name.trim();
  if (!name) throw new Error('El ejercicio necesita un nombre.');
  const res = await db.runAsync(
    `INSERT INTO exercises
       (name, muscle_primary, muscles_secondary, equipment, instructions, is_custom, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      name,
      input.muscle_primary,
      JSON.stringify(input.muscles_secondary ?? []),
      input.equipment ?? null,
      input.instructions ?? null,
      nowIso(),
    ],
  );
  return res.lastInsertRowId;
}
