import { fromKg, KG_PER_LB } from '../../units';
import { suggestOverload } from '../overload';
import {
  repRangeWarnings,
  volumeWarnings,
  weeklyVolume,
  type PlannedDay,
} from '../routineAnalysis';
import { RULE_ORDER, RULES } from '../rules';
import { SOURCES } from '../sources';

const ex = (
  id: number,
  muscle_primary: string,
  target_sets: number,
  rep_min = 8,
  rep_max = 12,
): PlannedDay['exercises'][number] => ({
  id,
  exercise_name: `Ejercicio ${id}`,
  muscle_primary,
  target_sets,
  rep_min,
  rep_max,
});

describe('rules and sources', () => {
  it('every rule cites at least one known source and is listed once', () => {
    for (const rule of Object.values(RULES)) {
      expect(rule.sources.length).toBeGreaterThan(0);
      for (const id of rule.sources) expect(SOURCES[id]).toBeDefined();
    }
    expect([...RULE_ORDER].sort()).toEqual(Object.keys(RULES).sort());
  });
});

describe('weeklyVolume', () => {
  const days: PlannedDay[] = [
    { exercises: [ex(1, 'chest', 4), ex(2, 'chest', 3), ex(3, 'triceps', 3)] },
    { exercises: [ex(4, 'back', 4)] },
    { exercises: [ex(5, 'chest', 4)] },
  ];

  it('sums sets and counts days per primary muscle', () => {
    expect(weeklyVolume(days)).toEqual([
      { muscle: 'chest', sets: 11, days: 2 },
      { muscle: 'back', sets: 4, days: 1 },
      { muscle: 'triceps', sets: 3, days: 1 },
    ]);
  });

  it('warns about low volume and frequency only where it applies', () => {
    const warnings = volumeWarnings(weeklyVolume(days), (m) => m);
    expect(warnings.filter((w) => w.message.startsWith('chest'))).toEqual([]);
    expect(warnings.filter((w) => w.message.startsWith('back')).map((w) => w.rule)).toEqual([
      'volume',
      'frequency',
    ]);
  });

  it('flags rep ranges outside 6–30', () => {
    const warnings = repRangeWarnings([
      { exercises: [ex(1, 'chest', 3, 3, 5), ex(2, 'chest', 3, 6, 30), ex(3, 'abs', 3, 20, 40)] },
    ]);
    expect(warnings.map((w) => w.message)).toEqual([
      'Ejercicio 1: 3–5 reps (recomendado 6–30).',
      'Ejercicio 3: 20–40 reps (recomendado 6–30).',
    ]);
  });
});

describe('suggestOverload', () => {
  const sets = (...pairs: [number, number][]) =>
    pairs.map(([weight_kg, reps], i) => ({ set_number: i + 1, weight_kg, reps }));
  const bench = { target_sets: 3, rep_max: 12, muscle_primary: 'chest' };

  it('suggests +2.5 kg upper body when every set hit rep_max', () => {
    expect(suggestOverload(sets([60, 12], [60, 12], [60, 13]), bench)).toEqual({
      fromKg: 60,
      toKg: 62.5,
    });
  });

  it('suggests +5 kg for lower body', () => {
    expect(
      suggestOverload(sets([100, 10], [100, 10]), {
        target_sets: 2,
        rep_max: 10,
        muscle_primary: 'quads',
      }),
    ).toEqual({ fromKg: 100, toKg: 105 });
  });

  it('does not suggest when a set fell short, sets are missing, or there is no load', () => {
    expect(suggestOverload(sets([60, 12], [60, 11], [60, 12]), bench)).toBeNull();
    expect(suggestOverload(sets([60, 12], [60, 12]), bench)).toBeNull();
    expect(suggestOverload(sets([0, 15], [0, 15], [0, 15]), bench)).toBeNull();
  });

  it('suggests round pound increments when the unit is lb', () => {
    const lb135 = 135 * KG_PER_LB;
    const s = suggestOverload(sets([lb135, 12], [lb135, 12], [lb135, 12]), bench, 'lb')!;
    expect(fromKg(s.toKg, 'lb')).toBe(140);
    const legs = { target_sets: 1, rep_max: 10, muscle_primary: 'quads' };
    expect(fromKg(suggestOverload(sets([lb135, 10]), legs, 'lb')!.toKg, 'lb')).toBe(145);
  });

  it('ignores extra sets beyond the target', () => {
    expect(suggestOverload(sets([60, 12], [60, 12], [60, 12], [50, 6]), bench)?.toKg).toBe(62.5);
  });
});
