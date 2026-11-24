export interface TemplateExercise {
  /** Slug of a catalog exercise. */
  slug: string;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  notes?: string;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  days: { name: string; weekday: number | null; exercises: TemplateExercise[] }[];
}

const x = (slug: string, target_sets = 4, notes?: string): TemplateExercise => ({
  slug,
  target_sets,
  rep_min: 12,
  rep_max: 12,
  notes,
});

const FACE_PULL = x('face-pull', 4, 'Polea alta, tirando de la cuerda hacia la frente.');
const BICEPS = [x('dumbbell-curl'), x('hammer-curl'), x('preacher-curl')];
const TRICEPS = [
  x('rope-pushdown'),
  x('cable-overhead-triceps-extension'),
  x('close-grip-machine-dip', 4, 'Asas giradas hacia dentro y codos pegados al cuerpo.'),
];
const SHOULDERS = [
  x('machine-rear-delt-fly'),
  FACE_PULL,
  x('machine-shoulder-press'),
  x('plate-front-raise'),
];

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'mi-rutina-4-dias',
    name: 'Mi rutina (4 días)',
    days: [
      {
        name: 'Espalda, hombro posterior y bíceps',
        weekday: 1,
        exercises: [
          x('lat-pulldown', 4, 'Barra larga, a la parte alta del pecho.'),
          x(
            'underhand-pulldown',
            3,
            'Misma barra larga, manos mirando hacia ti y agarre más cerrado.',
          ),
          x('seated-cable-row'),
          x('wide-grip-seated-cable-row', 4, 'Barra larga, manos más abiertas que los hombros.'),
          x('machine-rear-delt-fly'),
          FACE_PULL,
          ...BICEPS,
        ],
      },
      {
        name: 'Pecho, hombro anterior y tríceps',
        weekday: 2,
        exercises: [
          x('pec-deck'),
          x('machine-chest-press', 4, 'Máquina "Wide chest press".'),
          x('bench-press'),
          x('wide-grip-machine-dip', 4, 'Asas giradas hacia fuera y codos algo abiertos.'),
          x('machine-shoulder-press'),
          x('plate-front-raise'),
          ...TRICEPS,
        ],
      },
      { name: 'Pierna: cuádriceps y femoral', weekday: 3, exercises: [] },
      {
        name: 'Brazo completo y abdomen',
        weekday: 4,
        exercises: [...BICEPS, ...TRICEPS, ...SHOULDERS],
      },
    ],
  },
];
