export const MUSCLES = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  traps: 'Trapecio',
  abs: 'Abdomen',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Pantorrillas',
} as const;

export type Muscle = keyof typeof MUSCLES;

export const MUSCLE_IDS = Object.keys(MUSCLES) as Muscle[];

export const muscleLabel = (id: string) => MUSCLES[id as Muscle] ?? id;

export const EQUIPMENT = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  other: 'Otro',
} as const;

export type Equipment = keyof typeof EQUIPMENT;

/** Index matches Date.getDay(): 0 = domingo. */
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
/** Display order starting on Monday. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
