import type { Muscle } from '../data/muscles';
import { KG_PER_LB, type WeightUnit } from '../units';

const LOWER_BODY: ReadonlySet<string> = new Set<Muscle>([
  'quads',
  'hamstrings',
  'glutes',
  'calves',
]);

export const UPPER_BODY_INCREMENT_KG = 2.5;
export const LOWER_BODY_INCREMENT_KG = 5;

// In lb, the closest round plates: 5 lb ≈ 2.3 kg and 10 lb ≈ 4.5 kg.
export const UPPER_BODY_INCREMENT_LB = 5;
export const LOWER_BODY_INCREMENT_LB = 10;

/** Increment in kg; with `unit` 'lb' it is a round number of pounds. */
export const overloadIncrementKg = (muscle: string, unit: WeightUnit = 'kg') =>
  unit === 'lb'
    ? (LOWER_BODY.has(muscle) ? LOWER_BODY_INCREMENT_LB : UPPER_BODY_INCREMENT_LB) * KG_PER_LB
    : LOWER_BODY.has(muscle)
      ? LOWER_BODY_INCREMENT_KG
      : UPPER_BODY_INCREMENT_KG;

export interface OverloadSuggestion {
  fromKg: number;
  toKg: number;
}

/**
 * Suggests a heavier weight when every target set of the last session reached `rep_max`.
 * Returns null otherwise, or for bodyweight-only sets (0 kg). It is only a suggestion.
 */
export function suggestOverload(
  lastSets: { set_number: number; weight_kg: number; reps: number }[],
  target: { target_sets: number; rep_max: number; muscle_primary: string },
  unit: WeightUnit = 'kg',
): OverloadSuggestion | null {
  const working = lastSets.filter((s) => s.set_number <= target.target_sets);
  if (working.length < target.target_sets) return null;
  if (!working.every((s) => s.reps >= target.rep_max)) return null;
  const fromKg = Math.max(...working.map((s) => s.weight_kg));
  if (fromKg <= 0) return null;
  return { fromKg, toKg: fromKg + overloadIncrementKg(target.muscle_primary, unit) };
}
