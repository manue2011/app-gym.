// Published migration: never edit. Schema changes go in a new numbered file.
// Brings the user's "Mi rutina (4 días)" (created from the template) in line with the template:
// - back day: wide-grip seated cable row after the seated cable row, and back on Monday (it had
//   been moved to Tuesday by mistake, so Tuesday showed two days);
// - chest day: machine dip with an open grip replaces parallel-bar dips;
// - chest and arms days: close-grip machine dip after the overhead triceps extension.
// Only routine_exercises change: workout_sets point at exercises, so history stays as it was.
// Migrations run before seedExercises, so the new catalog rows are created here and seeding
// fills in their image and instructions.

const ROUTINE = `SELECT id FROM routines WHERE name = 'Mi rutina (4 días)' AND deleted_at IS NULL`;
const BACK = 'Espalda, hombro posterior y bíceps';
const CHEST = 'Pecho, hombro anterior y tríceps';
const ARMS = 'Brazo completo y abdomen';

const exerciseId = (slug: string) => `(SELECT id FROM exercises WHERE slug = '${slug}')`;

const addExercise = (slug: string, name: string, muscle: string, secondary: string[]) => `
INSERT INTO exercises (slug, name, muscle_primary, muscles_secondary, equipment, is_custom, created_at)
SELECT '${slug}', '${name}', '${muscle}', '${JSON.stringify(secondary)}',
       '${slug.endsWith('row') ? 'cable' : 'machine'}', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE slug = '${slug}');`;

/**
 * Adds `slug` (4 × 12, 120 s) to the routine's day named `dayName`, right after the first of
 * `anchors` found in that day (or at the end). Days that already have it are left alone.
 */
const insertAfter = (dayName: string, anchors: string[], slug: string, notes: string) => {
  const days = `SELECT id FROM routine_days
    WHERE name = '${dayName}' AND deleted_at IS NULL AND routine_id IN (${ROUTINE})
      AND id NOT IN (SELECT routine_day_id FROM routine_exercises WHERE exercise_id = ${exerciseId(slug)})`;
  const anchor = (day: string) =>
    `COALESCE(${anchors
      .map(
        (a) =>
          `(SELECT MIN(a.position) FROM routine_exercises a WHERE a.routine_day_id = ${day} AND a.exercise_id = ${exerciseId(a)})`,
      )
      .join(
        ', ',
      )}, (SELECT MAX(a.position) FROM routine_exercises a WHERE a.routine_day_id = ${day}), -1)`;
  return `
UPDATE routine_exercises SET position = position + 1
WHERE routine_day_id IN (${days}) AND position > ${anchor('routine_exercises.routine_day_id')};

INSERT INTO routine_exercises
  (routine_day_id, exercise_id, position, target_sets, rep_min, rep_max, rest_seconds, notes)
SELECT d.id, ${exerciseId(slug)}, ${anchor('d.id')} + 1, 4, 12, 12, 120, '${notes}'
FROM (${days}) d;`;
};

export const migration003 = `
${addExercise('wide-grip-seated-cable-row', 'Remo sentado en polea agarre amplio', 'back', ['shoulders', 'traps', 'biceps'])}
${addExercise('wide-grip-machine-dip', 'Fondos en máquina agarre abierto (pecho)', 'chest', ['triceps', 'shoulders'])}
${addExercise('close-grip-machine-dip', 'Fondos en máquina agarre cerrado (tríceps)', 'triceps', ['chest', 'shoulders'])}

UPDATE routine_days SET weekday = 1
WHERE name = '${BACK}' AND weekday = 2 AND deleted_at IS NULL AND routine_id IN (${ROUTINE})
  AND NOT EXISTS (SELECT 1 FROM routine_days o
                  WHERE o.routine_id = routine_days.routine_id AND o.weekday = 1 AND o.deleted_at IS NULL);

${insertAfter(BACK, ['seated-cable-row'], 'wide-grip-seated-cable-row', 'Barra larga, manos más abiertas que los hombros.')}

UPDATE routine_exercises
SET exercise_id = ${exerciseId('wide-grip-machine-dip')}, target_sets = 4, rep_min = 12, rep_max = 12,
    notes = 'Asas giradas hacia fuera y codos algo abiertos.'
WHERE exercise_id = ${exerciseId('dips')}
  AND routine_day_id IN (SELECT id FROM routine_days
                         WHERE name = '${CHEST}' AND deleted_at IS NULL AND routine_id IN (${ROUTINE}));
${insertAfter(CHEST, ['bench-press'], 'wide-grip-machine-dip', 'Asas giradas hacia fuera y codos algo abiertos.')}

${insertAfter(CHEST, ['cable-overhead-triceps-extension'], 'close-grip-machine-dip', 'Asas giradas hacia dentro y codos pegados al cuerpo.')}
${insertAfter(ARMS, ['cable-overhead-triceps-extension'], 'close-grip-machine-dip', 'Asas giradas hacia dentro y codos pegados al cuerpo.')}
`;
