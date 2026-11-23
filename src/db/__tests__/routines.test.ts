/** @jest-environment node */
import catalog from '../../data/exercises.json';
import { ROUTINE_TEMPLATES } from '../../data/templates';
import { initDatabase } from '../migrate';
import { createCustomExercise, listExercises } from '../repositories/exercises';
import {
  addDay,
  addExerciseToDay,
  createRoutine,
  createRoutineFromTemplate,
  dayForWeekday,
  deleteRoutine,
  duplicateRoutine,
  getActiveRoutine,
  getRoutine,
  listRoutines,
  removeDay,
  removeRoutineExercise,
  renameRoutine,
  reorderDays,
  reorderExercises,
  restoreDay,
  restoreRoutine,
  setActiveRoutine,
  updateDay,
  updateRoutineExercise,
  validateTargets,
  DEFAULT_TARGETS,
} from '../repositories/routines';
import type { Db } from '../types';
import { createTestDb } from '../__testutils__/testDb';

let db: Db & { raw: import('node:sqlite').DatabaseSync };
let benchId: number;
let squatId: number;

beforeEach(async () => {
  db = await createTestDb();
  const all = await listExercises(db);
  benchId = all.find((e) => e.name === 'Press de banca con barra')!.id;
  squatId = all.find((e) => e.name === 'Sentadilla con barra')!.id;
});

async function routineWithDay() {
  const routineId = await createRoutine(db, 'Push/Pull/Legs');
  const dayId = await addDay(db, routineId, { name: 'Pecho y tríceps', weekday: 1 });
  return { routineId, dayId };
}

describe('database setup', () => {
  it('seeds the catalog once, even if init runs again', async () => {
    await initDatabase(db);
    expect(await listExercises(db)).toHaveLength(catalog.length);
  });

  it('enforces foreign keys', async () => {
    await expect(
      db.runAsync('INSERT INTO routine_days (routine_id, name, position) VALUES (?, ?, ?)', [
        999,
        'x',
        0,
      ]),
    ).rejects.toThrow(/FOREIGN KEY/);
  });
});

describe('routines', () => {
  it('creates, lists and renames a routine', async () => {
    const id = await createRoutine(db, '  Torso/Pierna  ');
    await renameRoutine(db, id, 'Upper/Lower');
    const [r] = await listRoutines(db);
    expect(r).toMatchObject({ id, name: 'Upper/Lower', is_active: false, day_count: 0 });
  });

  it('rejects empty names', async () => {
    await expect(createRoutine(db, '   ')).rejects.toThrow('La rutina necesita un nombre.');
  });

  it('soft-deletes and restores a routine', async () => {
    const { routineId } = await routineWithDay();
    await setActiveRoutine(db, routineId);
    await deleteRoutine(db, routineId);

    expect(await listRoutines(db)).toHaveLength(0);
    expect(await getRoutine(db, routineId)).toBeNull();
    expect(await getActiveRoutine(db)).toBeNull();
    const raw = db.raw.prepare('SELECT deleted_at FROM routines WHERE id = ?').get(routineId);
    expect(raw?.deleted_at).toEqual(expect.any(String));

    await restoreRoutine(db, routineId);
    const restored = await getRoutine(db, routineId);
    expect(restored?.days).toHaveLength(1);
    expect(restored?.is_active).toBe(false);
  });

  it('keeps a single active routine', async () => {
    const a = await createRoutine(db, 'A');
    const b = await createRoutine(db, 'B');
    await setActiveRoutine(db, a);
    await setActiveRoutine(db, b);

    const routines = await listRoutines(db);
    expect(routines.filter((r) => r.is_active).map((r) => r.id)).toEqual([b]);
    expect(routines[0].id).toBe(b);
    expect((await getActiveRoutine(db))?.id).toBe(b);
  });

  it('duplicates days and exercises without touching the original', async () => {
    const { routineId, dayId } = await routineWithDay();
    await addExerciseToDay(db, dayId, benchId, { target_sets: 4, notes: 'Pausa abajo' });
    await removeDay(db, await addDay(db, routineId, { name: 'Borrado' }));
    await setActiveRoutine(db, routineId);

    const copyId = await duplicateRoutine(db, routineId);
    const copy = await getRoutine(db, copyId);
    expect(copy?.name).toBe('Push/Pull/Legs (copia)');
    expect(copy?.is_active).toBe(false);
    expect(copy?.days).toHaveLength(1);
    expect(copy?.days[0]).toMatchObject({ name: 'Pecho y tríceps', weekday: 1 });
    expect(copy?.days[0].exercises[0]).toMatchObject({
      exercise_id: benchId,
      target_sets: 4,
      notes: 'Pausa abajo',
    });

    await updateRoutineExercise(db, copy!.days[0].exercises[0].id, { target_sets: 2 });
    const original = await getRoutine(db, routineId);
    expect(original?.days[0].exercises[0].target_sets).toBe(4);
  });
});

describe('days', () => {
  it('adds days in order, edits and reorders them', async () => {
    const routineId = await createRoutine(db, 'PPL');
    const push = await addDay(db, routineId, { name: 'Push', weekday: 1 });
    const pull = await addDay(db, routineId, { name: 'Pull', weekday: 3 });
    const legs = await addDay(db, routineId, { name: 'Legs' });

    await updateDay(db, legs, { name: 'Pierna', weekday: 5 });
    await reorderDays(db, routineId, [legs, push, pull]);

    const r = await getRoutine(db, routineId);
    expect(r?.days.map((d) => [d.name, d.weekday])).toEqual([
      ['Pierna', 5],
      ['Push', 1],
      ['Pull', 3],
    ]);
    expect(dayForWeekday(r!, 3)?.name).toBe('Pull');
    expect(dayForWeekday(r!, 0)).toBeNull();
  });

  it('can clear the weekday', async () => {
    const { routineId, dayId } = await routineWithDay();
    await updateDay(db, dayId, { weekday: null });
    expect((await getRoutine(db, routineId))?.days[0].weekday).toBeNull();
  });

  it('rejects invalid weekdays', async () => {
    const routineId = await createRoutine(db, 'X');
    await expect(addDay(db, routineId, { name: 'Día', weekday: 7 })).rejects.toThrow();
  });

  it('soft-deletes a day so past workouts keep their reference', async () => {
    const { routineId, dayId } = await routineWithDay();
    await addExerciseToDay(db, dayId, benchId);
    const workout = await db.runAsync(
      'INSERT INTO workouts (routine_day_id, started_at) VALUES (?, ?)',
      [dayId, '2026-11-01T10:00:00.000Z'],
    );
    await db.runAsync(
      `INSERT INTO workout_sets (workout_id, exercise_id, set_number, weight_kg, reps, completed_at)
       VALUES (?, ?, 1, 80, 8, ?)`,
      [workout.lastInsertRowId, benchId, '2026-11-01T10:05:00.000Z'],
    );

    await removeDay(db, dayId);
    expect((await getRoutine(db, routineId))?.days).toHaveLength(0);

    const w = db.raw.prepare('SELECT routine_day_id FROM workouts').get();
    expect(w?.routine_day_id).toBe(dayId);
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM workout_sets').get()?.n).toBe(1);

    await restoreDay(db, dayId);
    expect((await getRoutine(db, routineId))?.days[0].exercises).toHaveLength(1);
  });

  it('appends new days after the remaining ones', async () => {
    const routineId = await createRoutine(db, 'X');
    const a = await addDay(db, routineId, { name: 'A' });
    await addDay(db, routineId, { name: 'B' });
    await removeDay(db, a);
    await addDay(db, routineId, { name: 'C' });
    expect((await getRoutine(db, routineId))?.days.map((d) => d.name)).toEqual(['B', 'C']);
  });
});

describe('exercises in a day', () => {
  it('adds with default targets and edits them', async () => {
    const { routineId, dayId } = await routineWithDay();
    const reId = await addExerciseToDay(db, dayId, benchId);
    await updateRoutineExercise(db, reId, { rep_min: 6, rep_max: 10, notes: '  ' });

    const [e] = (await getRoutine(db, routineId))!.days[0].exercises;
    expect(e).toMatchObject({
      exercise_name: 'Press de banca con barra',
      muscle_primary: 'chest',
      target_sets: DEFAULT_TARGETS.target_sets,
      rep_min: 6,
      rep_max: 10,
      rest_seconds: DEFAULT_TARGETS.rest_seconds,
      notes: null,
    });
  });

  it('rejects invalid targets', async () => {
    const { dayId } = await routineWithDay();
    const reId = await addExerciseToDay(db, dayId, benchId);
    await expect(updateRoutineExercise(db, reId, { rep_min: 12, rep_max: 8 })).rejects.toThrow(
      'El máximo de repeticiones no puede ser menor que el mínimo.',
    );
    await expect(addExerciseToDay(db, dayId, benchId, { target_sets: 0 })).rejects.toThrow(
      'Debe haber al menos 1 serie.',
    );
  });

  it('reorders and removes exercises', async () => {
    const { routineId, dayId } = await routineWithDay();
    const a = await addExerciseToDay(db, dayId, benchId);
    const b = await addExerciseToDay(db, dayId, squatId);
    await reorderExercises(db, dayId, [b, a]);
    let day = (await getRoutine(db, routineId))!.days[0];
    expect(day.exercises.map((e) => e.id)).toEqual([b, a]);

    await removeRoutineExercise(db, b);
    day = (await getRoutine(db, routineId))!.days[0];
    expect(day.exercises.map((e) => e.id)).toEqual([a]);
  });

  it('accepts custom exercises', async () => {
    const { routineId, dayId } = await routineWithDay();
    const custom = await createCustomExercise(db, {
      name: 'Press Hammer',
      muscle_primary: 'chest',
    });
    await addExerciseToDay(db, dayId, custom);
    const [e] = (await getRoutine(db, routineId))!.days[0].exercises;
    expect(e.exercise_name).toBe('Press Hammer');
    expect((await listExercises(db, 'chest')).find((x) => x.id === custom)?.is_custom).toBe(true);
  });
});

describe('validateTargets', () => {
  it('accepts the defaults', () => {
    expect(validateTargets(DEFAULT_TARGETS)).toBeNull();
  });

  it('rejects decimals and negative rest', () => {
    expect(validateTargets({ ...DEFAULT_TARGETS, target_sets: 2.5 })).toBe('Usa números enteros.');
    expect(validateTargets({ ...DEFAULT_TARGETS, rest_seconds: -1 })).toBe(
      'El descanso no puede ser negativo.',
    );
  });
});

describe('routine templates', () => {
  it('creates every template with its days, catalog exercises and custom ones only once', async () => {
    const db = await createTestDb();
    for (const template of ROUTINE_TEMPLATES) {
      const id = await createRoutineFromTemplate(db, template);
      const routine = await getRoutine(db, id);
      expect(routine?.name).toBe(template.name);
      expect(routine?.days.map((d) => [d.name, d.weekday, d.exercises.length])).toEqual(
        template.days.map((d) => [d.name, d.weekday, d.exercises.length]),
      );
    }
    const customCount = async () => (await listExercises(db)).filter((e) => e.is_custom).length;
    const before = await customCount();
    expect(before).toBeGreaterThan(0);
    await createRoutineFromTemplate(db, ROUTINE_TEMPLATES[0]);
    expect(await customCount()).toBe(before);
  });

  it('builds my 4-day routine as described', async () => {
    const db = await createTestDb();
    const routine = await getRoutine(db, await createRoutineFromTemplate(db, ROUTINE_TEMPLATES[0]));
    const monday = routine!.days.find((d) => d.weekday === 1)!;
    expect(monday.exercises.map((e) => [e.exercise_name, e.target_sets, e.rep_max])).toEqual([
      ['Jalón al pecho', 4, 12],
      ['Jalón al pecho agarre supino cerrado', 3, 12],
      ['Remo sentado en polea', 4, 12],
      ['Aperturas inversas en máquina (deltoides posterior)', 4, 12],
      ['Face pull', 4, 12],
      ['Curl con mancuernas', 4, 12],
      ['Curl martillo', 4, 12],
      ['Curl en banco Scott con barra', 4, 12],
    ]);
  });
});
