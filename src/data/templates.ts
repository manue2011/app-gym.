import type { Equipment, Muscle } from './muscles';

/** A catalog exercise (by slug) or a custom one created on import if it does not exist yet. */
export type TemplateExerciseRef =
  | { slug: string }
  | {
      custom: {
        name: string;
        muscle_primary: Muscle;
        muscles_secondary: Muscle[];
        equipment: Equipment;
        instructions: string;
      };
    };

export interface TemplateExercise {
  exercise: TemplateExerciseRef;
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

const SUPINE_PULLDOWN: TemplateExerciseRef = {
  custom: {
    name: 'Jalón al pecho agarre supino cerrado',
    muscle_primary: 'back',
    muscles_secondary: ['biceps'],
    equipment: 'cable',
    instructions:
      '1. Siéntate en la máquina de jalón y ajusta el soporte de los muslos.\n' +
      '2. Agarra la barra con las palmas mirando hacia ti, a la anchura de los hombros o algo menos.\n' +
      '3. Tira de la barra hacia la parte alta del pecho llevando los codos hacia abajo y atrás.\n' +
      '4. Sube de forma controlada hasta estirar los brazos y repite.',
  },
};

const MACHINE_REAR_DELT_FLY: TemplateExerciseRef = {
  custom: {
    name: 'Aperturas inversas en máquina (deltoides posterior)',
    muscle_primary: 'shoulders',
    muscles_secondary: ['traps', 'back'],
    equipment: 'machine',
    instructions:
      '1. Siéntate de frente al respaldo de la máquina de aperturas, con el pecho apoyado.\n' +
      '2. Agarra las asas con los brazos estirados al frente, a la altura de los hombros.\n' +
      '3. Abre los brazos hacia los lados hasta que queden en línea con el cuerpo.\n' +
      '4. Vuelve despacio al frente y repite.',
  },
};

const PLATE_FRONT_RAISE: TemplateExerciseRef = {
  custom: {
    name: 'Elevación frontal con disco',
    muscle_primary: 'shoulders',
    muscles_secondary: [],
    equipment: 'other',
    instructions:
      '1. De pie, sujeta un disco con las dos manos frente a los muslos, brazos casi estirados.\n' +
      '2. Sube el disco al frente hasta la altura de los ojos sin balancear el cuerpo.\n' +
      '3. Baja de forma controlada y repite.',
  },
};

const x = (exercise: TemplateExerciseRef, target_sets = 4, notes?: string): TemplateExercise => ({
  exercise,
  target_sets,
  rep_min: 12,
  rep_max: 12,
  notes,
});

const BICEPS = [
  x({ slug: 'dumbbell-curl' }),
  x({ slug: 'hammer-curl' }),
  x({ slug: 'preacher-curl' }),
];
const TRICEPS = [
  x({ slug: 'rope-pushdown' }),
  x(
    { slug: 'overhead-triceps-extension' },
    4,
    'En polea con cuerda: polea a la altura de la cintura, de espaldas a ella, tirando hacia arriba por encima de la cabeza y abriendo la cuerda.',
  ),
];
const SHOULDERS = [
  x(MACHINE_REAR_DELT_FLY),
  x({ slug: 'face-pull' }, 4, 'Polea alta, tirando de la cuerda hacia la frente.'),
  x({ slug: 'machine-shoulder-press' }),
  x(PLATE_FRONT_RAISE),
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
          x({ slug: 'lat-pulldown' }, 4, 'Barra larga, a la parte alta del pecho.'),
          x(SUPINE_PULLDOWN, 3, 'Misma barra larga, manos mirando hacia ti y agarre más cerrado.'),
          x({ slug: 'seated-cable-row' }),
          x(MACHINE_REAR_DELT_FLY),
          x({ slug: 'face-pull' }, 4, 'Polea alta, tirando de la cuerda hacia la frente.'),
          ...BICEPS,
        ],
      },
      {
        name: 'Pecho, hombro anterior y tríceps',
        weekday: 2,
        exercises: [
          x({ slug: 'pec-deck' }),
          x({ slug: 'machine-chest-press' }, 4, 'Máquina "Wide chest press".'),
          x({ slug: 'bench-press' }),
          x({ slug: 'machine-shoulder-press' }),
          x(PLATE_FRONT_RAISE),
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
