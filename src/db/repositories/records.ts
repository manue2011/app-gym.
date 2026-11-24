import type { Db } from '../types';
import type { WorkoutSet } from './workouts';

type LiftSet = Pick<WorkoutSet, 'weight_kg' | 'reps'>;

export interface PersonalRecord {
  exercise_id: number;
  /** 'weight': heaviest weight ever; 'reps': more reps than ever with that same weight. */
  kind: 'weight' | 'reps';
  weight_kg: number;
  reps: number;
  /** Previous best: weight in kg for 'weight', reps for 'reps'. */
  previous: number;
}

/**
 * Best new record among `today`'s sets of one exercise, compared with every earlier set.
 * A first time with an exercise is not a record: there is nothing to beat yet.
 */
export function findRecord(
  exerciseId: number,
  today: LiftSet[],
  before: LiftSet[],
): PersonalRecord | null {
  const done = today.filter((s) => s.reps > 0);
  if (done.length === 0 || before.length === 0) return null;
  const prevTop = Math.max(...before.map((s) => s.weight_kg));
  const heaviest = done.reduce((a, s) =>
    s.weight_kg > a.weight_kg || (s.weight_kg === a.weight_kg && s.reps > a.reps) ? s : a,
  );
  if (heaviest.weight_kg > prevTop) {
    return { exercise_id: exerciseId, kind: 'weight', ...heaviest, previous: prevTop };
  }
  let best: PersonalRecord | null = null;
  for (const s of done) {
    const rivals = before.filter((b) => b.weight_kg === s.weight_kg);
    if (rivals.length === 0) continue;
    const previous = Math.max(...rivals.map((b) => b.reps));
    if (s.reps > previous && (!best || s.weight_kg > best.weight_kg)) {
      best = { exercise_id: exerciseId, kind: 'reps', ...s, previous };
    }
  }
  return best;
}

/** Records set in `workoutId`, one per exercise at most, in the order they were trained. */
export async function getWorkoutRecords(db: Db, workoutId: number): Promise<PersonalRecord[]> {
  const today = await db.getAllAsync<LiftSet & { exercise_id: number }>(
    `SELECT exercise_id, weight_kg, reps FROM workout_sets WHERE workout_id = ?
     ORDER BY completed_at, id`,
    [workoutId],
  );
  const records: PersonalRecord[] = [];
  for (const exerciseId of [...new Set(today.map((s) => s.exercise_id))]) {
    const before = await getSetsBefore(db, exerciseId, workoutId);
    const record = findRecord(
      exerciseId,
      today.filter((s) => s.exercise_id === exerciseId),
      before,
    );
    if (record) records.push(record);
  }
  return records;
}

/** Every set of `exerciseId` from workouts started before `workoutId`. */
export async function getSetsBefore(
  db: Db,
  exerciseId: number,
  workoutId: number,
): Promise<LiftSet[]> {
  return db.getAllAsync<LiftSet>(
    `SELECT s.weight_kg, s.reps FROM workout_sets s JOIN workouts w ON w.id = s.workout_id
     WHERE s.exercise_id = ?
       AND w.started_at < (SELECT started_at FROM workouts WHERE id = ?)`,
    [exerciseId, workoutId],
  );
}

export interface WorkoutSummary {
  duration_min: number | null;
  sets: number;
  exercises: number;
  total_reps: number;
  /** Sum of weight × reps, in kg. */
  volume_kg: number;
}

export async function getWorkoutSummary(db: Db, workoutId: number): Promise<WorkoutSummary> {
  const row = await db.getFirstAsync<{
    started_at: string;
    finished_at: string | null;
    sets: number;
    exercises: number;
    total_reps: number | null;
    volume_kg: number | null;
  }>(
    `SELECT w.started_at, w.finished_at, COUNT(s.id) AS sets,
       COUNT(DISTINCT s.exercise_id) AS exercises, SUM(s.reps) AS total_reps,
       SUM(s.weight_kg * s.reps) AS volume_kg
     FROM workouts w LEFT JOIN workout_sets s ON s.workout_id = w.id
     WHERE w.id = ? GROUP BY w.id`,
    [workoutId],
  );
  if (!row) return { duration_min: null, sets: 0, exercises: 0, total_reps: 0, volume_kg: 0 };
  return {
    duration_min: row.finished_at
      ? Math.round((Date.parse(row.finished_at) - Date.parse(row.started_at)) / 60_000)
      : null,
    sets: row.sets,
    exercises: row.exercises,
    total_reps: row.total_reps ?? 0,
    volume_kg: row.volume_kg ?? 0,
  };
}

// ---------- Weekly volume actually done ----------

/** Monday 00:00 (local time) of the week containing `date`, as YYYY-MM-DD. */
export function weekStart(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface WeeklyMuscleSets {
  muscle: string;
  /** Oldest first, one entry per week (including weeks with 0 sets). */
  weeks: { week: string; sets: number }[];
}

/**
 * Sets done per primary muscle in each of the last `weeks` weeks (current week included).
 * Sets with 0 reps do not count.
 */
export function groupWeeklySets(
  rows: { muscle: string; completed_at: string }[],
  now: Date,
  weeks: number,
): WeeklyMuscleSets[] {
  const labels: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    labels.push(weekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * i)));
  }
  const byMuscle = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const week = weekStart(new Date(r.completed_at));
    if (!labels.includes(week)) continue;
    const counts = byMuscle.get(r.muscle) ?? new Map<string, number>();
    counts.set(week, (counts.get(week) ?? 0) + 1);
    byMuscle.set(r.muscle, counts);
  }
  return [...byMuscle]
    .map(([muscle, counts]) => ({
      muscle,
      weeks: labels.map((week) => ({ week, sets: counts.get(week) ?? 0 })),
    }))
    .sort(
      (a, b) => b.weeks.reduce((n, w) => n + w.sets, 0) - a.weeks.reduce((n, w) => n + w.sets, 0),
    );
}

export async function getWeeklySetsByMuscle(
  db: Db,
  weeks = 8,
  now = new Date(),
): Promise<WeeklyMuscleSets[]> {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * weeks);
  const rows = await db.getAllAsync<{ muscle: string; completed_at: string }>(
    `SELECT e.muscle_primary AS muscle, s.completed_at
     FROM workout_sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.reps > 0 AND s.completed_at >= ?`,
    [since.toISOString()],
  );
  return groupWeeklySets(rows, now, weeks);
}
