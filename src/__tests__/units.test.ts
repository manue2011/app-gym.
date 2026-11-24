import { formatWeight, formatWeightUnit, fromKg, KG_PER_LB, parseWeightToKg } from '../units';

describe('weight units', () => {
  it('keeps kg as entered and formats with a decimal comma', () => {
    expect(parseWeightToKg('62,5', 'kg')).toBe(62.5);
    expect(formatWeightUnit(62.5, 'kg')).toBe('62,5 kg');
    expect(formatWeight(60, 'kg')).toBe('60');
  });

  it('stores lb input in kg and shows it back unchanged', () => {
    const kg = parseWeightToKg('135', 'lb');
    expect(kg).toBeCloseTo(61.235, 3);
    expect(fromKg(kg, 'lb')).toBe(135);
    expect(formatWeightUnit(100 * KG_PER_LB, 'lb')).toBe('100 lb');
    expect(formatWeight(60, 'lb')).toBe('132,3');
  });

  it('returns NaN for empty input', () => {
    expect(parseWeightToKg(' ', 'kg')).toBeNaN();
  });
});
