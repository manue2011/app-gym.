/** @jest-environment node */
import catalog from '../../data/exercises.json';
import { EXERCISE_MEDIA } from '../../data/exerciseMedia';
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
import { getWorkoutSets, logSet, startWorkout } from '../repositories/workouts';
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
  it('creates every template with its days and catalog exercises', async () => {
    const db = await createTestDb();
    for (const template of ROUTINE_TEMPLATES) {
      const id = await createRoutineFromTemplate(db, template);
      const routine = await getRoutine(db, id);
      expect(routine?.name).toBe(template.name);
      expect(routine?.days.map((d) => [d.name, d.weekday, d.exercises.length])).toEqual(
        template.days.map((d) => [d.name, d.weekday, d.exercises.length]),
      );
    }
  });

  it('every template exercise has an image', () => {
    for (const t of ROUTINE_TEMPLATES)
      for (const d of t.days)
        for (const e of d.exercises) expect(EXERCISE_MEDIA[e.slug]).toBeDefined();
  });

  it('builds my 4-day routine as described', async () => {
    const db = await createTestDb();
    const routine = await getRoutine(db, await createRoutineFromTemplate(db, ROUTINE_TEMPLATES[0]));
    const monday = routine!.days.find((d) => d.weekday === 1)!;
    expect(monday.exercises.map((e) => [e.exercise_slug, e.target_sets, e.rep_max])).toEqual([
      ['lat-pulldown', 4, 12],
      ['underhand-pulldown', 3, 12],
      ['seated-cable-row', 4, 12],
      ['wide-grip-seated-cable-row', 4, 12],
      ['machine-rear-delt-fly', 4, 12],
      ['face-pull', 4, 12],
      ['dumbbell-curl', 4, 12],
      ['hammer-curl', 4, 12],
      ['preacher-curl', 4, 12],
    ]);
    const slugsOn = (weekday: number) =>
      routine!.days.find((d) => d.weekday === weekday)!.exercises.map((e) => e.exercise_slug);
    expect(slugsOn(2)).toEqual([
      'pec-deck',
      'machine-chest-press',
      'bench-press',
      'wide-grip-machine-dip',
      'machine-shoulder-press',
      'plate-front-raise',
      'rope-pushdown',
      'cable-overhead-triceps-extension',
      'close-grip-machine-dip',
    ]);
    expect(slugsOn(4)).toContain('close-grip-machine-dip');
  });
});

describe('migration 002', () => {
  it('adopts the old template custom exercises and moves the overhead extension to the cable one', async () => {
    const db = await createTestDb();
    const newSlugs = [
      'underhand-pulldown',
      'machine-rear-delt-fly',
      'plate-front-raise',
      'cable-overhead-triceps-extension',
    ];
    await db.execAsync(`DELETE FROM exercises WHERE slug IN ('${newSlugs.join("','")}')`);
    const pulldownId = await createCustomExercise(db, {
      name: 'Jalón al pecho agarre supino cerrado',
      muscle_primary: 'back',
    });
    const routineId = await createRoutine(db, 'Mi rutina (4 días)');
    const dayId = await addDay(db, routineId, { name: 'Lunes' });
    const all = await listExercises(db);
    const overheadId = all.find((e) => e.slug === 'overhead-triceps-extension')!.id;
    await addExerciseToDay(db, dayId, pulldownId);
    await addExerciseToDay(db, dayId, overheadId, {
      notes:
        'En polea con cuerda: polea a la altura de la cintura, de espaldas a ella, tirando hacia arriba por encima de la cabeza y abriendo la cuerda.',
    });
    await addExerciseToDay(db, dayId, overheadId, { notes: 'Con mancuerna' });

    await db.execAsync('PRAGMA user_version = 1');
    await initDatabase(db);

    const pulldown = (await listExercises(db)).find((e) => e.id === pulldownId)!;
    expect([pulldown.slug, pulldown.is_custom]).toEqual(['underhand-pulldown', false]);
    const day = (await getRoutine(db, routineId))!.days[0];
    expect(day.exercises.map((e) => [e.exercise_slug, e.notes])).toEqual([
      ['underhand-pulldown', null],
      ['cable-overhead-triceps-extension', null],
      ['overhead-triceps-extension', 'Con mancuerna'],
    ]);
    const slugs = (await listExercises(db)).map((e) => e.slug);
    for (const s of newSlugs) expect(slugs.filter((x) => x === s)).toHaveLength(1);
  });
});

describe('migration 003', () => {
  it('adds the wide row and machine dips to my routine, puts back day on Monday and keeps history', async () => {
    const db = await createTestDb();
    const newSlugs = [
      'wide-grip-seated-cable-row',
      'wide-grip-machine-dip',
      'close-grip-machine-dip',
    ];
    await db.execAsync(`DELETE FROM exercises WHERE slug IN ('${newSlugs.join("','")}')`);
    const idOf = async (slug: string) => (await listExercises(db)).find((e) => e.slug === slug)!.id;

    // As it was on the phone: back day moved to Tuesday by mistake, dips added by hand.
    const routineId = await createRoutine(db, 'Mi rutina (4 días)');
    const back = await addDay(db, routineId, {
      name: 'Espalda, hombro posterior y bíceps',
      weekday: 2,
    });
    const chest = await addDay(db, routineId, {
      name: 'Pecho, hombro anterior y tríceps',
      weekday: 2,
    });
    const arms = await addDay(db, routineId, { name: 'Brazo completo y abdomen', weekday: 4 });
    for (const slug of ['lat-pulldown', 'seated-cable-row', 'face-pull'])
      await addExerciseToDay(db, back, await idOf(slug));
    for (const slug of ['bench-press', 'dips', 'rope-pushdown', 'cable-overhead-triceps-extension'])
      await addExerciseToDay(db, chest, await idOf(slug), { rep_min: 8 });
    for (const slug of ['rope-pushdown', 'cable-overhead-triceps-extension', 'plate-front-raise'])
      await addExerciseToDay(db, arms, await idOf(slug));
    const dipsId = await idOf('dips');
    const workoutId = await startWorkout(db, chest);
    await logSet(db, {
      workout_id: workoutId,
      exercise_id: dipsId,
      set_number: 1,
      weight_kg: 0,
      reps: 10,
      rir: 2,
    });
    const other = await createRoutine(db, 'Otra');
    const otherDay = await addDay(db, other, {
      name: 'Pecho, hombro anterior y tríceps',
      weekday: 2,
    });
    await addExerciseToDay(db, otherDay, dipsId);

    await db.execAsync('PRAGMA user_version = 2');
    await initDatabase(db);
    await initDatabase(db);

    const days = (await getRoutine(db, routineId))!.days;
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 4]);
    const slugs = days.map((d) => d.exercises.map((e) => e.exercise_slug));
    expect(slugs).toEqual([
      ['lat-pulldown', 'seated-cable-row', 'wide-grip-seated-cable-row', 'face-pull'],
      [
        'bench-press',
        'wide-grip-machine-dip',
        'rope-pushdown',
        'cable-overhead-triceps-extension',
        'close-grip-machine-dip',
      ],
      [
        'rope-pushdown',
        'cable-overhead-triceps-extension',
        'close-grip-machine-dip',
        'plate-front-raise',
      ],
    ]);
    for (const d of days)
      expect(d.exercises.map((e) => e.position)).toEqual(d.exercises.map((_, i) => i));
    const wideDip = days[1].exercises[1];
    expect([wideDip.target_sets, wideDip.rep_min, wideDip.rep_max, wideDip.rest_seconds]).toEqual([
      4, 12, 12, 120,
    ]);

    const dipRow = (await listExercises(db)).find((e) => e.slug === 'close-grip-machine-dip')!;
    expect(dipRow.name).toBe('Fondos en máquina agarre cerrado (tríceps)');
    expect(EXERCISE_MEDIA[dipRow.slug!]).toBeDefined();
    expect((await getWorkoutSets(db, workoutId)).map((s) => s.exercise_id)).toEqual([dipsId]);
    expect((await getRoutine(db, other))!.days[0].exercises.map((e) => e.exercise_slug)).toEqual([
      'dips',
    ]);
  });
});
