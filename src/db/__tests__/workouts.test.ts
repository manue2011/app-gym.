/** @jest-environment node */
import catalog from '../../data/exercises.json';
import { EXERCISE_MEDIA } from '../../data/exerciseMedia';
import { createTestDb } from '../__testutils__/testDb';
import { getExercise, listExercises } from '../repositories/exercises';
import {
  addDay,
  addExerciseToDay,
  createRoutine,
  removeRoutineExercise,
  updateRoutineExercise,
} from '../repositories/routines';
import {
  deleteSet,
  discardOpenWorkout,
  finishWorkout,
  getExerciseHistory,
  getLastPerformance,
  getOpenWorkout,
  getWorkoutSets,
  listLoggedExercises,
  logSet,
  prefillFor,
  startWorkout,
  validateSet,
} from '../repositories/workouts';
import type { Db } from '../types';

let db: Db;
let benchId: number;
let dayId: number;

beforeEach(async () => {
  db = await createTestDb();
  benchId = (await listExercises(db)).find((e) => e.slug === 'bench-press')!.id;
  const routineId = await createRoutine(db, 'PPL');
  dayId = await addDay(db, routineId, { name: 'Push', weekday: 1 });
});

const set = (workout_id: number, set_number: number, weight_kg: number, reps: number) =>
  logSet(db, { workout_id, exercise_id: benchId, set_number, weight_kg, reps, rir: 2 });

describe('workouts', () => {
  it('logs sets and tracks the open workout until it is finished', async () => {
    const w = await startWorkout(db, dayId);
    expect((await getOpenWorkout(db))?.id).toBe(w);

    await set(w, 1, 60, 10);
    await set(w, 2, 62.5, 8);
    expect((await getWorkoutSets(db, w)).map((s) => [s.set_number, s.weight_kg, s.reps])).toEqual([
      [1, 60, 10],
      [2, 62.5, 8],
    ]);

    await finishWorkout(db, w);
    expect(await getOpenWorkout(db)).toBeNull();
  });

  it('logging the same set again overwrites it', async () => {
    const w = await startWorkout(db, dayId);
    const a = await set(w, 1, 60, 10);
    const b = await set(w, 1, 65, 9);
    expect(b).toBe(a);
    expect(await getWorkoutSets(db, w)).toEqual([
      expect.objectContaining({ weight_kg: 65, reps: 9 }),
    ]);
    await deleteSet(db, a);
    expect(await getWorkoutSets(db, w)).toEqual([]);
  });

  it('discards an open workout with its sets, but never a finished one', async () => {
    const open = await startWorkout(db, dayId);
    await set(open, 1, 60, 10);
    expect(await discardOpenWorkout(db, open)).toBe(true);
    expect(await getOpenWorkout(db)).toBeNull();
    expect(await getWorkoutSets(db, open)).toEqual([]);

    const done = await startWorkout(db, dayId);
    await set(done, 1, 60, 10);
    await finishWorkout(db, done);
    expect(await discardOpenWorkout(db, done)).toBe(false);
    expect(await getWorkoutSets(db, done)).toHaveLength(1);
  });

  it('pre-fills from the previous workout, not the current one', async () => {
    const first = await startWorkout(db, dayId);
    await set(first, 1, 60, 10);
    await set(first, 2, 60, 9);
    await finishWorkout(db, first);

    const today = await startWorkout(db, dayId);
    await set(today, 1, 70, 5);

    const last = await getLastPerformance(db, benchId, today);
    expect(last.map((s) => s.workout_id)).toEqual([first, first]);
    expect(prefillFor(last, 2)).toEqual({ weight_kg: 60, reps: 9, rir: 2 });
    // A third set that did not exist last time reuses the last one.
    expect(prefillFor(last, 3)).toEqual({ weight_kg: 60, reps: 9, rir: 2 });
    expect(prefillFor([], 1)).toBeNull();
  });

  it('editing or emptying the routine never changes logged history', async () => {
    const reId = await addExerciseToDay(db, dayId, benchId);
    const w = await startWorkout(db, dayId);
    await set(w, 1, 80, 8);
    await finishWorkout(db, w);

    await updateRoutineExercise(db, reId, { target_sets: 5, rep_min: 3, rep_max: 5 });
    await removeRoutineExercise(db, reId);

    expect(await getWorkoutSets(db, w)).toEqual([
      expect.objectContaining({ weight_kg: 80, reps: 8, set_number: 1 }),
    ]);
  });

  it('rejects invalid sets', async () => {
    const w = await startWorkout(db, dayId);
    await expect(set(w, 1, -5, 10)).rejects.toThrow('Indica un peso válido (0 o más).');
    expect(validateSet({ weight_kg: 50, reps: 8.5, rir: null })).toBe(
      'Indica las repeticiones (número entero).',
    );
    expect(validateSet({ weight_kg: 50, reps: 8, rir: 6 })).toBe('El RIR debe estar entre 0 y 5.');
    expect(validateSet({ weight_kg: 0, reps: 12, rir: null })).toBeNull();
  });
});

describe('progress', () => {
  it('summarizes each session: top weight, reps at that weight and volume', async () => {
    const first = await startWorkout(db, dayId);
    await set(first, 1, 60, 10);
    await set(first, 2, 65, 6);
    await set(first, 3, 65, 8);
    await finishWorkout(db, first);
    const second = await startWorkout(db, dayId);
    await set(second, 1, 70, 5);

    const history = await getExerciseHistory(db, benchId);
    expect(history.map((h) => h.workout_id)).toEqual([first, second]);
    expect(history[0]).toMatchObject({
      top_weight_kg: 65,
      top_weight_reps: 8,
      total_reps: 24,
      volume_kg: 60 * 10 + 65 * 6 + 65 * 8,
    });
    expect(history[0].sets).toHaveLength(3);
    expect(history[1]).toMatchObject({ top_weight_kg: 70, top_weight_reps: 5 });

    const logged = await listLoggedExercises(db);
    expect(logged).toEqual([expect.objectContaining({ exercise_id: benchId, sessions: 2 })]);
  });

  it('returns nothing for exercises never logged', async () => {
    expect(await getExerciseHistory(db, benchId)).toEqual([]);
    expect(await listLoggedExercises(db)).toEqual([]);
  });
});

describe('exercise catalog media', () => {
  it('every catalog exercise has an animation, two frames and instructions', () => {
    for (const e of catalog) {
      const media = EXERCISE_MEDIA[e.slug];
      expect(media).toBeDefined();
      expect(media.frames).toHaveLength(2);
      expect(e.instructions).toMatch(/^1\. /);
    }
  });

  it('every media entry matches a catalog exercise and its gif_path', async () => {
    for (const [slug, media] of Object.entries(EXERCISE_MEDIA)) {
      const entry = catalog.find((e) => e.slug === slug);
      expect(entry?.gif_path).toBeTruthy();
      expect(media.imageCredit.author).not.toBe('');
    }
  });

  it('stores media paths and instructions, and refreshes them on re-seed', async () => {
    const bench = await getExercise(db, benchId);
    expect(bench?.gif_path).toBe('bench-press.gif');
    expect(bench?.instructions).toContain('banco');
  });
});
