// Published migration: never edit. Schema changes go in a new numbered file.
// The "Mi rutina (4 días)" template used to create three custom exercises and to use the
// dumbbell overhead extension with a note. Those exercises are now in the catalog with images:
// adopt the custom rows (same id, so routines and history keep pointing at them) and move the
// template's overhead extension entries to the cable version. seedExercises fills in the rest.
const adopt = (slug: string, name: string) => `
UPDATE exercises SET slug = '${slug}', is_custom = 0
WHERE id = (SELECT MIN(id) FROM exercises WHERE is_custom = 1 AND slug IS NULL AND name = '${name}')
  AND NOT EXISTS (SELECT 1 FROM exercises WHERE slug = '${slug}');`;

const OLD_OVERHEAD_NOTE =
  'En polea con cuerda: polea a la altura de la cintura, de espaldas a ella, tirando hacia arriba por encima de la cabeza y abriendo la cuerda.';

export const migration002 = `
${adopt('underhand-pulldown', 'Jalón al pecho agarre supino cerrado')}
${adopt('machine-rear-delt-fly', 'Aperturas inversas en máquina (deltoides posterior)')}
${adopt('plate-front-raise', 'Elevación frontal con disco')}

INSERT INTO exercises (slug, name, muscle_primary, muscles_secondary, equipment, is_custom, created_at)
SELECT 'cable-overhead-triceps-extension', 'Extensión de tríceps sobre la cabeza en polea (de espaldas)',
       'triceps', '[]', 'cable', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE EXISTS (SELECT 1 FROM routine_exercises WHERE notes = '${OLD_OVERHEAD_NOTE}')
  AND NOT EXISTS (SELECT 1 FROM exercises WHERE slug = 'cable-overhead-triceps-extension');

UPDATE routine_exercises
SET exercise_id = (SELECT id FROM exercises WHERE slug = 'cable-overhead-triceps-extension'),
    notes = NULL
WHERE notes = '${OLD_OVERHEAD_NOTE}'
  AND exercise_id = (SELECT id FROM exercises WHERE slug = 'overhead-triceps-extension');
`;
