/** Weights are always stored in kg; lb is only for display and input. */
export type WeightUnit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

/** Weight in the display unit, rounded to what a gym can load (0.01 kg or 0.1 lb). */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? Math.round(kg * 100) / 100 : Math.round((kg / KG_PER_LB) * 10) / 10;
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** "62,5" in kg or "137,8" in lb: decimal comma, no trailing zeros. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return String(fromKg(kg, unit)).replace('.', ',');
}

/** "62,5 kg" / "137,8 lb". */
export const formatWeightUnit = (kg: number, unit: WeightUnit) =>
  `${formatWeight(kg, unit)} ${unit}`;

/** Parses user input with comma or dot; NaN when empty or invalid. */
export function parseWeightToKg(text: string, unit: WeightUnit): number {
  if (text.trim() === '') return NaN;
  return toKg(Number(text.replace(',', '.')), unit);
}
