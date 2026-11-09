import { create } from 'zustand';

import {
  createRoutine,
  deleteRoutine,
  duplicateRoutine,
  listRoutines,
  restoreRoutine,
  setActiveRoutine,
  type Routine,
} from '../db/repositories/routines';
import type { Db } from '../db/types';

interface RoutinesState {
  routines: Routine[];
  /** Last deleted routine, kept so the list can offer "Deshacer". */
  lastDeleted: { id: number; name: string; wasActive: boolean } | null;
  refresh: (db: Db) => Promise<void>;
  create: (db: Db, name: string) => Promise<number>;
  duplicate: (db: Db, id: number) => Promise<number>;
  setActive: (db: Db, id: number) => Promise<void>;
  remove: (db: Db, id: number, name: string) => Promise<void>;
  undoRemove: (db: Db) => Promise<void>;
  dismissUndo: () => void;
}

export const useRoutinesStore = create<RoutinesState>((set, get) => ({
  routines: [],
  lastDeleted: null,
  refresh: async (db) => set({ routines: await listRoutines(db) }),
  create: async (db, name) => {
    const id = await createRoutine(db, name);
    await get().refresh(db);
    return id;
  },
  duplicate: async (db, id) => {
    const newId = await duplicateRoutine(db, id);
    await get().refresh(db);
    return newId;
  },
  setActive: async (db, id) => {
    await setActiveRoutine(db, id);
    await get().refresh(db);
  },
  remove: async (db, id, name) => {
    const wasActive = get().routines.some((r) => r.id === id && r.is_active);
    await deleteRoutine(db, id);
    set({ lastDeleted: { id, name, wasActive } });
    await get().refresh(db);
  },
  undoRemove: async (db) => {
    const deleted = get().lastDeleted;
    if (!deleted) return;
    await restoreRoutine(db, deleted.id);
    if (deleted.wasActive) await setActiveRoutine(db, deleted.id);
    set({ lastDeleted: null });
    await get().refresh(db);
  },
  dismissUndo: () => set({ lastDeleted: null }),
}));
