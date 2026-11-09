// Published migration: never edit. Schema changes go in a new numbered file.
// Deviations from the model in CLAUDE.md:
// - exercises.slug: stable key for the built-in catalog (null for custom exercises).
// - routine_days.deleted_at: removing a day is a soft delete, so past workouts keep their day.
// - weekday uses JS Date.getDay(): 0 = domingo ... 6 = sábado.
export const migration001 = `
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  muscle_primary TEXT NOT NULL,
  muscles_secondary TEXT NOT NULL DEFAULT '[]',
  equipment TEXT,
  gif_path TEXT,
  instructions TEXT,
  common_mistakes TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE UNIQUE INDEX routines_single_active ON routines (is_active)
  WHERE is_active = 1 AND deleted_at IS NULL;

CREATE TABLE routine_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL REFERENCES routines (id),
  name TEXT NOT NULL,
  weekday INTEGER CHECK (weekday BETWEEN 0 AND 6),
  position INTEGER NOT NULL,
  deleted_at TEXT
);

CREATE INDEX routine_days_routine ON routine_days (routine_id, position);

CREATE TABLE routine_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_day_id INTEGER NOT NULL REFERENCES routine_days (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises (id),
  position INTEGER NOT NULL,
  target_sets INTEGER NOT NULL CHECK (target_sets >= 1),
  rep_min INTEGER NOT NULL CHECK (rep_min >= 1),
  rep_max INTEGER NOT NULL CHECK (rep_max >= rep_min),
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds >= 0),
  notes TEXT
);

CREATE INDEX routine_exercises_day ON routine_exercises (routine_day_id, position);

CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_day_id INTEGER REFERENCES routine_days (id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  notes TEXT
);

CREATE TABLE workout_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises (id),
  set_number INTEGER NOT NULL,
  weight_kg REAL NOT NULL CHECK (weight_kg >= 0),
  reps INTEGER NOT NULL CHECK (reps >= 0),
  rir INTEGER CHECK (rir BETWEEN 0 AND 5),
  completed_at TEXT NOT NULL
);

CREATE INDEX workout_sets_exercise ON workout_sets (exercise_id, completed_at);
`;
