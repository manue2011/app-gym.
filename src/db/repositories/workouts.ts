import { nowIso, type Db } from '../types';

export interface Workout {
  id: number;
  routine_day_id: number | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface WorkoutSet {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir: number | null;
  completed_at: string;
}

export interface SetInput {
  weight_kg: number;
  reps: number;
  rir: number | null;
}

/** Returns a user-facing error message, or null when the set is valid. */
export function validateSet(s: SetInput): string | null {
  if (!Number.isFinite(s.weight_kg) || s.weight_kg < 0) return 'Indica un peso válido (0 o más).';
  if (!Number.isInteger(s.reps) || s.reps < 0) return 'Indica las repeticiones (número entero).';
  if (s.rir !== null && (!Number.isInteger(s.rir) || s.rir < 0 || s.rir > 5)) {
    return 'El RIR debe estar entre 0 y 5.';
  }
  return null;
}

function assertValid(s: SetInput) {
  const error = validateSet(s);
  if (error) throw new Error(error);
}

const WORKOUT_COLUMNS = 'id, routine_day_id, started_at, finished_at, notes';
const SET_COLUMNS = 'id, workout_id, exercise_id, set_number, weight_kg, reps, rir, completed_at';

export async function startWorkout(db: Db, routineDayId: number | null): Promise<number> {
  const res = await db.runAsync('INSERT INTO workouts (routine_day_id, started_at) VALUES (?, ?)', [
    routineDayId,
    nowIso(),
  ]);
  return res.lastInsertRowId;
}

export async function getWorkout(db: Db, id: number): Promise<Workout | null> {
  return db.getFirstAsync<Workout>(`SELECT ${WORKOUT_COLUMNS} FROM workouts WHERE id = ?`, [id]);
}

/** The most recent workout that was started but not finished, if any. */
export async function getOpenWorkout(db: Db): Promise<Workout | null> {
  return db.getFirstAsync<Workout>(
    `SELECT ${WORKOUT_COLUMNS} FROM workouts WHERE finished_at IS NULL
     ORDER BY started_at DESC, id DESC LIMIT 1`,
    [],
  );
}

export async function finishWorkout(db: Db, id: number, notes?: string): Promise<void> {
  await db.runAsync('UPDATE workouts SET finished_at = ?, notes = ? WHERE id = ?', [
    nowIso(),
    notes?.trim() || null,
    id,
  ]);
}

/**
 * Deletes an unfinished workout and its sets, when the user chooses not to keep it.
 * Finished workouts are history and are never deleted here.
 */
export async function discardOpenWorkout(db: Db, id: number): Promise<boolean> {
  let deleted = false;
  await db.withTransactionAsync(async () => {
    const open = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM workouts WHERE id = ? AND finished_at IS NULL',
      [id],
    );
    if (!open) return;
    await db.runAsync('DELETE FROM workout_sets WHERE workout_id = ?', [id]);
    await db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
    deleted = true;
  });
  return deleted;
}

export async function getWorkoutSets(db: Db, workoutId: number): Promise<WorkoutSet[]> {
  return db.getAllAsync<WorkoutSet>(
    `SELECT ${SET_COLUMNS} FROM workout_sets WHERE workout_id = ?
     ORDER BY exercise_id, set_number`,
    [workoutId],
  );
}

/** Saves a completed set. Logging the same set number again overwrites it. */
export async function logSet(
  db: Db,
  input: SetInput & { workout_id: number; exercise_id: number; set_number: number },
): Promise<number> {
  assertValid(input);
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM workout_sets WHERE workout_id = ? AND exercise_id = ? AND set_number = ?',
    [input.workout_id, input.exercise_id, input.set_number],
  );
  if (existing) {
    await updateSet(db, existing.id, input);
    return existing.id;
  }
  const res = await db.runAsync(
    `INSERT INTO workout_sets
       (workout_id, exercise_id, set_number, weight_kg, reps, rir, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.workout_id,
      input.exercise_id,
      input.set_number,
      input.weight_kg,
      input.reps,
      input.rir,
      nowIso(),
    ],
  );
  return res.lastInsertRowId;
}

export async function updateSet(db: Db, id: number, input: SetInput): Promise<void> {
  assertValid(input);
  await db.runAsync('UPDATE workout_sets SET weight_kg = ?, reps = ?, rir = ? WHERE id = ?', [
    input.weight_kg,
    input.reps,
    input.rir,
    id,
  ]);
}

export async function deleteSet(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [id]);
}

/**
 * Sets of `exerciseId` from the most recent other workout where it was logged,
 * used to pre-fill today's session.
 */
export async function getLastPerformance(
  db: Db,
  exerciseId: number,
  excludeWorkoutId?: number,
): Promise<WorkoutSet[]> {
  const last = await db.getFirstAsync<{ workout_id: number }>(
    `SELECT s.workout_id FROM workout_sets s
     WHERE s.exercise_id = ? AND s.workout_id != ?
     ORDER BY s.completed_at DESC, s.id DESC LIMIT 1`,
    [exerciseId, excludeWorkoutId ?? -1],
  );
  if (!last) return [];
  return db.getAllAsync<WorkoutSet>(
    `SELECT ${SET_COLUMNS} FROM workout_sets WHERE workout_id = ? AND exercise_id = ?
     ORDER BY set_number`,
    [last.workout_id, exerciseId],
  );
}

/** Pre-fill values for set `setNumber` (1-based): same set last time, else the last set done. */
export function prefillFor(last: WorkoutSet[], setNumber: number): SetInput | null {
  const s = last.find((x) => x.set_number === setNumber) ?? last[last.length - 1];
  return s ? { weight_kg: s.weight_kg, reps: s.reps, rir: s.rir } : null;
}

// ---------- Progress ----------

export interface LoggedExercise {
  exercise_id: number;
  name: string;
  slug: string | null;
  muscle_primary: string;
  sessions: number;
  last_at: string;
}

/** Exercises with at least one logged set, most recently trained first. */
export async function listLoggedExercises(db: Db): Promise<LoggedExercise[]> {
  return db.getAllAsync<LoggedExercise>(
    `SELECT e.id AS exercise_id, e.name, e.slug, e.muscle_primary,
       COUNT(DISTINCT s.workout_id) AS sessions, MAX(s.completed_at) AS last_at
     FROM workout_sets s JOIN exercises e ON e.id = s.exercise_id
     GROUP BY e.id ORDER BY last_at DESC`,
    [],
  );
}

export interface SessionSummary {
  workout_id: number;
  started_at: string;
  sets: { weight_kg: number; reps: number }[];
  /** Heaviest weight lifted and the most reps done with it. */
  top_weight_kg: number;
  top_weight_reps: number;
  total_reps: number;
  /** Sum of weight × reps. */
  volume_kg: number;
}

type HistoryRow = Pick<WorkoutSet, 'workout_id' | 'set_number' | 'weight_kg' | 'reps'> & {
  started_at: string;
};

/** Groups logged sets into one summary per workout, oldest first. */
export function summarizeSessions(rows: HistoryRow[]): SessionSummary[] {
  const byWorkout = new Map<number, SessionSummary>();
  for (const r of rows) {
    let s = byWorkout.get(r.workout_id);
    if (!s) {
      s = {
        workout_id: r.workout_id,
        started_at: r.started_at,
        sets: [],
        top_weight_kg: 0,
        top_weight_reps: 0,
        total_reps: 0,
        volume_kg: 0,
      };
      byWorkout.set(r.workout_id, s);
    }
    s.sets.push({ weight_kg: r.weight_kg, reps: r.reps });
    s.total_reps += r.reps;
    s.volume_kg += r.weight_kg * r.reps;
    if (r.weight_kg > s.top_weight_kg) {
      s.top_weight_kg = r.weight_kg;
      s.top_weight_reps = r.reps;
    } else if (r.weight_kg === s.top_weight_kg) {
      s.top_weight_reps = Math.max(s.top_weight_reps, r.reps);
    }
  }
  return [...byWorkout.values()].sort((a, b) => a.started_at.localeCompare(b.started_at));
}

export async function getExerciseHistory(db: Db, exerciseId: number): Promise<SessionSummary[]> {
  const rows = await db.getAllAsync<HistoryRow>(
    `SELECT s.workout_id, s.set_number, s.weight_kg, s.reps, w.started_at
     FROM workout_sets s JOIN workouts w ON w.id = s.workout_id
     WHERE s.exercise_id = ? ORDER BY w.started_at, s.set_number`,
    [exerciseId],
  );
  return summarizeSessions(rows);
}
