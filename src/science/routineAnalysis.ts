import type { Muscle } from '../data/muscles';
import { MIN_WEEKLY_FREQUENCY, MIN_WEEKLY_SETS, REP_RANGE, type RuleId } from './rules';

/** Minimal shape of a routine needed for the analysis (matches RoutineDetail). */
export interface PlannedDay {
  exercises: {
    id: number;
    exercise_name: string;
    muscle_primary: string;
    target_sets: number;
    rep_min: number;
    rep_max: number;
  }[];
}

export interface MuscleVolume {
  muscle: Muscle | string;
  /** Planned sets per week (sets of exercises whose primary muscle is this one). */
  sets: number;
  /** Number of days in the routine that train it. */
  days: number;
}

export interface RoutineWarning {
  rule: RuleId;
  message: string;
}

/**
 * Weekly sets and frequency per primary muscle, assuming the routine's days are done once a week.
 * Sorted by sets, highest first.
 */
export function weeklyVolume(days: PlannedDay[]): MuscleVolume[] {
  const byMuscle = new Map<string, MuscleVolume>();
  for (const day of days) {
    const trainedToday = new Set<string>();
    for (const e of day.exercises) {
      let v = byMuscle.get(e.muscle_primary);
      if (!v) {
        v = { muscle: e.muscle_primary, sets: 0, days: 0 };
        byMuscle.set(e.muscle_primary, v);
      }
      v.sets += e.target_sets;
      if (!trainedToday.has(e.muscle_primary)) {
        trainedToday.add(e.muscle_primary);
        v.days += 1;
      }
    }
  }
  return [...byMuscle.values()].sort((a, b) => b.sets - a.sets);
}

export function volumeWarnings(
  volume: MuscleVolume[],
  label: (muscle: string) => string,
): RoutineWarning[] {
  const warnings: RoutineWarning[] = [];
  for (const v of volume) {
    if (v.sets < MIN_WEEKLY_SETS) {
      warnings.push({
        rule: 'volume',
        message: `${label(v.muscle)}: ${v.sets} series/semana (recomendado ${MIN_WEEKLY_SETS} o más).`,
      });
    }
    if (v.days < MIN_WEEKLY_FREQUENCY) {
      warnings.push({
        rule: 'frequency',
        message: `${label(v.muscle)}: ${v.days === 1 ? '1 día' : `${v.days} días`} a la semana (recomendado ${MIN_WEEKLY_FREQUENCY} o más).`,
      });
    }
  }
  return warnings;
}

/** Exercises whose planned rep range falls outside the range supported for hypertrophy. */
export function repRangeWarnings(days: PlannedDay[]): RoutineWarning[] {
  return days.flatMap((d) =>
    d.exercises
      .filter((e) => e.rep_min < REP_RANGE.min || e.rep_max > REP_RANGE.max)
      .map((e) => ({
        rule: 'repRange' as const,
        message: `${e.exercise_name}: ${e.rep_min}–${e.rep_max} reps (recomendado ${REP_RANGE.min}–${REP_RANGE.max}).`,
      })),
  );
}
