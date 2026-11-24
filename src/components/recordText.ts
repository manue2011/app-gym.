import type { PersonalRecord } from '../db/repositories/records';
import { formatWeightUnit, type WeightUnit } from '../units';

/** "🏆 Récord de peso: 65 kg × 6 (antes 62,5 kg)". */
export function recordText(r: PersonalRecord, unit: WeightUnit): string {
  return r.kind === 'weight'
    ? `🏆 Récord de peso: ${formatWeightUnit(r.weight_kg, unit)} × ${r.reps} (antes ${formatWeightUnit(r.previous, unit)})`
    : `🏆 Récord de repeticiones: ${r.reps} con ${formatWeightUnit(r.weight_kg, unit)} (antes ${r.previous})`;
}
