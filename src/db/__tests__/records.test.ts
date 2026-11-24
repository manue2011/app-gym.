/** @jest-environment node */
import { createTestDb } from '../__testutils__/testDb';
import { listExercises } from '../repositories/exercises';
import {
  findRecord,
  getWorkoutRecords,
  getWorkoutSummary,
  groupWeeklySets,
  weekStart,
} from '../repositories/records';
import { finishWorkout, logSet, startWorkout } from '../repositories/workouts';
import type { Db } from '../types';

const s = (weight_kg: number, reps: number) => ({ weight_kg, reps });

describe('findRecord', () => {
  it('is not a record the first time', () => {
    expect(findRecord(1, [s(60, 10)], [])).toBeNull();
  });

  it('detects a heavier weight than ever', () => {
    expect(findRecord(1, [s(60, 10), s(65, 6)], [s(62.5, 8)])).toEqual({
      exercise_id: 1,
      kind: 'weight',
      weight_kg: 65,
      reps: 6,
      previous: 62.5,
    });
  });

  it('detects more reps than ever with the same weight', () => {
    expect(findRecord(1, [s(60, 12), s(50, 15)], [s(60, 10), s(50, 20)])).toEqual({
      exercise_id: 1,
      kind: 'reps',
      weight_kg: 60,
      reps: 12,
      previous: 10,
    });
  });

  it('does not count reps with a weight never used before', () => {
    expect(findRecord(1, [s(40, 20)], [s(60, 10)])).toBeNull();
  });

  it('ignores sets with zero reps', () => {
    expect(findRecord(1, [s(100, 0)], [s(60, 10)])).toBeNull();
  });
});

describe('workout records and summary', () => {
  let db: Db;
  let benchId: number;
  const startedAt = async (id: number, iso: string) =>
    db.runAsync('UPDATE workouts SET started_at = ? WHERE id = ?', [iso, id]);

  beforeEach(async () => {
    db = await createTestDb();
    benchId = (await listExercises(db)).find((e) => e.slug === 'bench-press')!.id;
  });

  it('compares only with earlier workouts and sums the session', async () => {
    const log = (workout_id: number, set_number: number, weight_kg: number, reps: number) =>
      logSet(db, { workout_id, exercise_id: benchId, set_number, weight_kg, reps, rir: 1 });
    const first = await startWorkout(db, null);
    await startedAt(first, '2026-11-01T10:00:00.000Z');
    await log(first, 1, 60, 10);
    const second = await startWorkout(db, null);
    await startedAt(second, '2026-11-08T10:00:00.000Z');
    await log(second, 1, 62.5, 8);
    await log(second, 2, 60, 9);
    await finishWorkout(db, second);

    expect(await getWorkoutRecords(db, first)).toEqual([]);
    expect(await getWorkoutRecords(db, second)).toEqual([
      { exercise_id: benchId, kind: 'weight', weight_kg: 62.5, reps: 8, previous: 60 },
    ]);
    const summary = await getWorkoutSummary(db, second);
    expect(summary).toMatchObject({ sets: 2, exercises: 1, total_reps: 17, volume_kg: 1040 });
  });
});

describe('weekly sets by muscle', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart(new Date(2026, 10, 24))).toBe('2026-11-23'); // Tuesday
    expect(weekStart(new Date(2026, 10, 29))).toBe('2026-11-23'); // Sunday
    expect(weekStart(new Date(2026, 10, 30))).toBe('2026-11-30'); // Monday
  });

  it('counts sets per muscle and week, with empty weeks and nothing older', () => {
    const at = (day: number) => new Date(2026, 10, day, 18).toISOString();
    const rows = [
      { muscle: 'chest', completed_at: at(24) },
      { muscle: 'chest', completed_at: at(23) },
      { muscle: 'chest', completed_at: at(17) },
      { muscle: 'back', completed_at: at(24) },
      { muscle: 'back', completed_at: at(2) }, // too old for 3 weeks
    ];
    expect(groupWeeklySets(rows, new Date(2026, 10, 25), 3)).toEqual([
      {
        muscle: 'chest',
        weeks: [
          { week: '2026-11-09', sets: 0 },
          { week: '2026-11-16', sets: 1 },
          { week: '2026-11-23', sets: 2 },
        ],
      },
      {
        muscle: 'back',
        weeks: [
          { week: '2026-11-09', sets: 0 },
          { week: '2026-11-16', sets: 0 },
          { week: '2026-11-23', sets: 1 },
        ],
      },
    ]);
  });
});
