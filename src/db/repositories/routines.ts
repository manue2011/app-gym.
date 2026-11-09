import { nowIso, type Db } from '../types';

export interface Routine {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  day_count: number;
}

export interface RoutineDay {
  id: number;
  routine_id: number;
  name: string;
  /** 0 = domingo ... 6 = sábado; null = sin día fijo. */
  weekday: number | null;
  position: number;
}

export interface RoutineExercise {
  id: number;
  routine_day_id: number;
  exercise_id: number;
  exercise_name: string;
  muscle_primary: string;
  position: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  notes: string | null;
}

export interface RoutineDetail extends Omit<Routine, 'day_count'> {
  days: (RoutineDay & { exercises: RoutineExercise[] })[];
}

export interface ExerciseTargets {
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  notes: string | null;
}

export const DEFAULT_TARGETS: ExerciseTargets = {
  target_sets: 3,
  rep_min: 8,
  rep_max: 12,
  rest_seconds: 120,
  notes: null,
};

/** Returns a user-facing error message, or null when the targets are valid. */
export function validateTargets(t: ExerciseTargets): string | null {
  const ints = [t.target_sets, t.rep_min, t.rep_max, t.rest_seconds];
  if (!ints.every(Number.isInteger)) return 'Usa números enteros.';
  if (t.target_sets < 1) return 'Debe haber al menos 1 serie.';
  if (t.rep_min < 1) return 'El mínimo de repeticiones debe ser al menos 1.';
  if (t.rep_max < t.rep_min) return 'El máximo de repeticiones no puede ser menor que el mínimo.';
  if (t.rest_seconds < 0) return 'El descanso no puede ser negativo.';
  return null;
}

function cleanName(name: string, what: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error(`${what} necesita un nombre.`);
  return trimmed;
}

type RoutineRow = Omit<Routine, 'is_active'> & { is_active: number };

const toRoutine = (r: RoutineRow): Routine => ({ ...r, is_active: r.is_active === 1 });

const touch = (db: Db, routineId: number) =>
  db.runAsync('UPDATE routines SET updated_at = ? WHERE id = ?', [nowIso(), routineId]);

async function routineIdOfDay(db: Db, dayId: number): Promise<number> {
  const row = await db.getFirstAsync<{ routine_id: number }>(
    'SELECT routine_id FROM routine_days WHERE id = ?',
    [dayId],
  );
  if (!row) throw new Error(`Routine day ${dayId} not found`);
  return row.routine_id;
}

async function routineIdOfExercise(db: Db, routineExerciseId: number): Promise<number> {
  const row = await db.getFirstAsync<{ routine_id: number }>(
    `SELECT d.routine_id FROM routine_exercises re
     JOIN routine_days d ON d.id = re.routine_day_id WHERE re.id = ?`,
    [routineExerciseId],
  );
  if (!row) throw new Error(`Routine exercise ${routineExerciseId} not found`);
  return row.routine_id;
}

// ---------- Routines ----------

export async function listRoutines(db: Db): Promise<Routine[]> {
  const rows = await db.getAllAsync<RoutineRow>(
    `SELECT r.id, r.name, r.is_active, r.created_at, r.updated_at,
       (SELECT COUNT(*) FROM routine_days d
         WHERE d.routine_id = r.id AND d.deleted_at IS NULL) AS day_count
     FROM routines r
     WHERE r.deleted_at IS NULL
     ORDER BY r.is_active DESC, r.updated_at DESC, r.id DESC`,
    [],
  );
  return rows.map(toRoutine);
}

export async function getRoutine(db: Db, id: number): Promise<RoutineDetail | null> {
  const routine = await db.getFirstAsync<Omit<RoutineRow, 'day_count'>>(
    `SELECT id, name, is_active, created_at, updated_at
     FROM routines WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  if (!routine) return null;
  const days = await db.getAllAsync<RoutineDay>(
    `SELECT id, routine_id, name, weekday, position FROM routine_days
     WHERE routine_id = ? AND deleted_at IS NULL ORDER BY position`,
    [id],
  );
  const exercises = await db.getAllAsync<RoutineExercise>(
    `SELECT re.id, re.routine_day_id, re.exercise_id, e.name AS exercise_name,
       e.muscle_primary, re.position, re.target_sets, re.rep_min, re.rep_max,
       re.rest_seconds, re.notes
     FROM routine_exercises re
     JOIN routine_days d ON d.id = re.routine_day_id
     JOIN exercises e ON e.id = re.exercise_id
     WHERE d.routine_id = ? AND d.deleted_at IS NULL
     ORDER BY re.position`,
    [id],
  );
  return {
    ...routine,
    is_active: routine.is_active === 1,
    days: days.map((d) => ({
      ...d,
      exercises: exercises.filter((e) => e.routine_day_id === d.id),
    })),
  };
}

export async function createRoutine(db: Db, name: string): Promise<number> {
  const now = nowIso();
  const res = await db.runAsync(
    'INSERT INTO routines (name, is_active, created_at, updated_at) VALUES (?, 0, ?, ?)',
    [cleanName(name, 'La rutina'), now, now],
  );
  return res.lastInsertRowId;
}

export async function renameRoutine(db: Db, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE routines SET name = ?, updated_at = ? WHERE id = ?', [
    cleanName(name, 'La rutina'),
    nowIso(),
    id,
  ]);
}

/** Soft delete: the routine disappears from lists but can be restored. History is untouched. */
export async function deleteRoutine(db: Db, id: number): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    'UPDATE routines SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ?',
    [now, now, id],
  );
}

export async function restoreRoutine(db: Db, id: number): Promise<void> {
  await db.runAsync('UPDATE routines SET deleted_at = NULL, updated_at = ? WHERE id = ?', [
    nowIso(),
    id,
  ]);
}

/** Copies the routine with its current days and exercises. The copy starts inactive. */
export async function duplicateRoutine(db: Db, id: number, name?: string): Promise<number> {
  const source = await getRoutine(db, id);
  if (!source) throw new Error(`Routine ${id} not found`);
  let newId = 0;
  await db.withTransactionAsync(async () => {
    newId = await createRoutine(db, name ?? `${source.name} (copia)`);
    for (const day of source.days) {
      const dayRes = await db.runAsync(
        'INSERT INTO routine_days (routine_id, name, weekday, position) VALUES (?, ?, ?, ?)',
        [newId, day.name, day.weekday, day.position],
      );
      for (const e of day.exercises) {
        await db.runAsync(
          `INSERT INTO routine_exercises
             (routine_day_id, exercise_id, position, target_sets, rep_min, rep_max, rest_seconds, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dayRes.lastInsertRowId,
            e.exercise_id,
            e.position,
            e.target_sets,
            e.rep_min,
            e.rep_max,
            e.rest_seconds,
            e.notes,
          ],
        );
      }
    }
  });
  return newId;
}

export async function setActiveRoutine(db: Db, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE routines SET is_active = 0 WHERE is_active = 1', []);
    await db.runAsync(
      'UPDATE routines SET is_active = 1, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [nowIso(), id],
    );
  });
}

export async function clearActiveRoutine(db: Db): Promise<void> {
  await db.runAsync('UPDATE routines SET is_active = 0 WHERE is_active = 1', []);
}

export async function getActiveRoutine(db: Db): Promise<RoutineDetail | null> {
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM routines WHERE is_active = 1 AND deleted_at IS NULL',
    [],
  );
  return row ? getRoutine(db, row.id) : null;
}

// ---------- Days ----------

export async function addDay(
  db: Db,
  routineId: number,
  input: { name: string; weekday?: number | null },
): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ next: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM routine_days
       WHERE routine_id = ? AND deleted_at IS NULL`,
      [routineId],
    );
    const res = await db.runAsync(
      'INSERT INTO routine_days (routine_id, name, weekday, position) VALUES (?, ?, ?, ?)',
      [routineId, cleanName(input.name, 'El día'), input.weekday ?? null, row?.next ?? 0],
    );
    id = res.lastInsertRowId;
    await touch(db, routineId);
  });
  return id;
}

export async function updateDay(
  db: Db,
  dayId: number,
  patch: { name?: string; weekday?: number | null },
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(cleanName(patch.name, 'El día'));
  }
  if (patch.weekday !== undefined) {
    sets.push('weekday = ?');
    params.push(patch.weekday);
  }
  if (sets.length === 0) return;
  const routineId = await routineIdOfDay(db, dayId);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE routine_days SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      dayId,
    ]);
    await touch(db, routineId);
  });
}

/** Soft delete so past workouts that point to this day keep their reference. */
export async function removeDay(db: Db, dayId: number): Promise<void> {
  const routineId = await routineIdOfDay(db, dayId);
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE routine_days SET deleted_at = ? WHERE id = ?', [nowIso(), dayId]);
    await touch(db, routineId);
  });
}

export async function restoreDay(db: Db, dayId: number): Promise<void> {
  const routineId = await routineIdOfDay(db, dayId);
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE routine_days SET deleted_at = NULL WHERE id = ?', [dayId]);
    await touch(db, routineId);
  });
}

/** `orderedIds` must contain every active day of the routine, in the new order. */
export async function reorderDays(db: Db, routineId: number, orderedIds: number[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [position, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE routine_days SET position = ? WHERE id = ? AND routine_id = ?', [
        position,
        id,
        routineId,
      ]);
    }
    await touch(db, routineId);
  });
}

// ---------- Exercises in a day ----------

export async function addExerciseToDay(
  db: Db,
  dayId: number,
  exerciseId: number,
  targets: Partial<ExerciseTargets> = {},
): Promise<number> {
  const t = { ...DEFAULT_TARGETS, ...targets };
  const error = validateTargets(t);
  if (error) throw new Error(error);
  const routineId = await routineIdOfDay(db, dayId);
  let id = 0;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ next: number }>(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM routine_exercises WHERE routine_day_id = ?',
      [dayId],
    );
    const res = await db.runAsync(
      `INSERT INTO routine_exercises
         (routine_day_id, exercise_id, position, target_sets, rep_min, rep_max, rest_seconds, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dayId,
        exerciseId,
        row?.next ?? 0,
        t.target_sets,
        t.rep_min,
        t.rep_max,
        t.rest_seconds,
        t.notes,
      ],
    );
    id = res.lastInsertRowId;
    await touch(db, routineId);
  });
  return id;
}

export async function updateRoutineExercise(
  db: Db,
  routineExerciseId: number,
  patch: Partial<ExerciseTargets>,
): Promise<void> {
  const current = await db.getFirstAsync<ExerciseTargets>(
    'SELECT target_sets, rep_min, rep_max, rest_seconds, notes FROM routine_exercises WHERE id = ?',
    [routineExerciseId],
  );
  if (!current) throw new Error(`Routine exercise ${routineExerciseId} not found`);
  const t = { ...current, ...patch };
  const error = validateTargets(t);
  if (error) throw new Error(error);
  const routineId = await routineIdOfExercise(db, routineExerciseId);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE routine_exercises
       SET target_sets = ?, rep_min = ?, rep_max = ?, rest_seconds = ?, notes = ?
       WHERE id = ?`,
      [
        t.target_sets,
        t.rep_min,
        t.rep_max,
        t.rest_seconds,
        t.notes?.trim() || null,
        routineExerciseId,
      ],
    );
    await touch(db, routineId);
  });
}

/** Hard delete is safe: logged sets reference the exercise, not this plan entry. */
export async function removeRoutineExercise(db: Db, routineExerciseId: number): Promise<void> {
  const routineId = await routineIdOfExercise(db, routineExerciseId);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM routine_exercises WHERE id = ?', [routineExerciseId]);
    await touch(db, routineId);
  });
}

/** `orderedIds` must contain every exercise of the day, in the new order. */
export async function reorderExercises(db: Db, dayId: number, orderedIds: number[]): Promise<void> {
  const routineId = await routineIdOfDay(db, dayId);
  await db.withTransactionAsync(async () => {
    for (const [position, id] of orderedIds.entries()) {
      await db.runAsync(
        'UPDATE routine_exercises SET position = ? WHERE id = ? AND routine_day_id = ?',
        [position, id, dayId],
      );
    }
    await touch(db, routineId);
  });
}

/** Day of the active routine assigned to `weekday`, if any. */
export function dayForWeekday(routine: RoutineDetail, weekday: number) {
  return routine.days.find((d) => d.weekday === weekday) ?? null;
}

/** A single day with its exercises, including soft-deleted days (for past workouts). */
export async function getRoutineDay(
  db: Db,
  dayId: number,
): Promise<(RoutineDay & { routine_name: string; exercises: RoutineExercise[] }) | null> {
  const day = await db.getFirstAsync<RoutineDay & { routine_name: string }>(
    `SELECT d.id, d.routine_id, d.name, d.weekday, d.position, r.name AS routine_name
     FROM routine_days d JOIN routines r ON r.id = d.routine_id WHERE d.id = ?`,
    [dayId],
  );
  if (!day) return null;
  const exercises = await db.getAllAsync<RoutineExercise>(
    `SELECT re.id, re.routine_day_id, re.exercise_id, e.name AS exercise_name,
       e.muscle_primary, re.position, re.target_sets, re.rep_min, re.rep_max,
       re.rest_seconds, re.notes
     FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id
     WHERE re.routine_day_id = ? ORDER BY re.position`,
    [dayId],
  );
  return { ...day, exercises };
}
