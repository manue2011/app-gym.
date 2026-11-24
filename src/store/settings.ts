import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { WEIGHT_UNIT_KEY } from '../data/settings';
import type { WeightUnit } from '../units';

interface UnitState {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
}

const readUnit = (): WeightUnit => {
  try {
    return Storage.getItemSync(WEIGHT_UNIT_KEY) === 'lb' ? 'lb' : 'kg';
  } catch {
    return 'kg';
  }
};

export const useUnitStore = create<UnitState>((set) => ({
  unit: readUnit(),
  setUnit: (unit) => {
    Storage.setItemSync(WEIGHT_UNIT_KEY, unit);
    set({ unit });
  },
}));

export const useWeightUnit = () => useUnitStore((s) => s.unit);
