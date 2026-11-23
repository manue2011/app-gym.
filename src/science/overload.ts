import type { Muscle } from '../data/muscles';

const LOWER_BODY: ReadonlySet<string> = new Set<Muscle>([
  'quads',
  'hamstrings',
  'glutes',
  'calves',
]);

export const UPPER_BODY_INCREMENT_KG = 2.5;
export const LOWER_BODY_INCREMENT_KG = 5;

export const overloadIncrementKg = (muscle: string) =>
  LOWER_BODY.has(muscle) ? LOWER_BODY_INCREMENT_KG : UPPER_BODY_INCREMENT_KG;

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
): OverloadSuggestion | null {
  const working = lastSets.filter((s) => s.set_number <= target.target_sets);
  if (working.length < target.target_sets) return null;
  if (!working.every((s) => s.reps >= target.rep_max)) return null;
  const fromKg = Math.max(...working.map((s) => s.weight_kg));
  if (fromKg <= 0) return null;
  return { fromKg, toKg: fromKg + overloadIncrementKg(target.muscle_primary) };
}
