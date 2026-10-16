'use client';

/**
 * 应用状态（zustand + persist/IndexedDB）。
 *
 * 与旧实现的差别：
 * - 动作直接改状态，落盘交给 persist 中间件；不再「写 storage → 全量深拷贝读回 → 整体 set」；
 * - 组件用选择器订阅（useShallow），不再因为一次人员改名而重渲染整棵树；
 * - 人事不物理删除，只归档，历史排班不会出现悬空引用。
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { AppData, Person, Schedule, Weekday } from '@/domain/types';
import { createMemoryStorage, idbStorage, isIndexedDbAvailable } from './persist';
import { normalizeAppData } from './migrate';

export const STORE_KEY = 'onduty';
export const STORE_VERSION = 1;

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type NewPersonInput = {
  name: string;
  department?: string;
  phone?: string;
  email?: string;
  color?: string;
  isActive?: boolean;
  excludedDays?: Weekday[];
};

interface AppStore extends AppData {
  /** persist 是否已完成水合（首屏据此决定显示加载态） */
  hydrated: boolean;
  setHydrated: (value: boolean) => void;

  addPerson: (input: NewPersonInput) => Person;
  updatePerson: (id: string, patch: Partial<Omit<Person, 'id'>>) => void;
  setPersonActive: (id: string, active: boolean) => void;
  archivePerson: (id: string) => void;
  restorePerson: (id: string) => void;
  reorderPersons: (orderedIds: string[]) => void;

  saveSchedule: (schedule: Schedule) => void;
  renameSchedule: (id: string, name: string) => void;
  deleteSchedule: (id: string) => void;
  setActiveSchedule: (id: string | null) => void;

  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const EMPTY: AppData = { persons: [], schedules: [], activeScheduleId: null };

function reindex(persons: Person[]): Person[] {
  return persons.map((person, index) => (person.order === index ? person : { ...person, order: index }));
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),

      addPerson: (input) => {
        const persons = get().persons;
        const person: Person = {
          id: newId(),
          name: input.name.trim(),
          department: input.department?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          email: input.email?.trim() || undefined,
          color: input.color,
          isActive: input.isActive ?? true,
          order: persons.length,
          excludedDays: input.excludedDays ?? [],
          archivedAt: null,
        };
        set({ persons: [...persons, person] });
        return person;
      },

      updatePerson: (id, patch) =>
        set((state) => ({
          persons: state.persons.map((person) => (person.id === id ? { ...person, ...patch, id } : person)),
        })),

      setPersonActive: (id, active) =>
        set((state) => ({
          persons: state.persons.map((person) => (person.id === id ? { ...person, isActive: active } : person)),
        })),

      archivePerson: (id) =>
        set((state) => ({
          persons: reindex(
            state.persons.map((person) =>
              person.id === id ? { ...person, archivedAt: new Date().toISOString(), isActive: false } : person
            )
          ),
        })),

      restorePerson: (id) =>
        set((state) => ({
          persons: reindex(
            state.persons.map((person) => (person.id === id ? { ...person, archivedAt: null, isActive: true } : person))
          ),
        })),

      reorderPersons: (orderedIds) =>
        set((state) => {
          const byId = new Map(state.persons.map((person) => [person.id, person]));
          const ordered: Person[] = [];
          for (const id of orderedIds) {
            const person = byId.get(id);
            if (person) {
              ordered.push(person);
              byId.delete(id);
            }
          }
          // 未出现在 orderedIds 里的人追加在后面，绝不丢人
          for (const person of state.persons) if (byId.has(person.id)) ordered.push(person);
          return { persons: reindex(ordered) };
        }),

      saveSchedule: (schedule) =>
        set((state) => {
          const index = state.schedules.findIndex((s) => s.id === schedule.id);
          const schedules =
            index === -1
              ? [...state.schedules, schedule]
              : state.schedules.map((s) => (s.id === schedule.id ? schedule : s));
          return { schedules, activeScheduleId: schedule.id };
        }),

      renameSchedule: (id, name) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s
          ),
        })),

      deleteSchedule: (id) =>
        set((state) => {
          const schedules = state.schedules.filter((s) => s.id !== id);
          const activeScheduleId =
            state.activeScheduleId === id ? (schedules[0]?.id ?? null) : state.activeScheduleId;
          return { schedules, activeScheduleId };
        }),

      setActiveSchedule: (id) => set({ activeScheduleId: id }),

      replaceAll: (data) => set({ ...normalizeAppData(data) }),

      resetAll: () => set({ ...EMPTY }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      // 由 bootstrap 显式触发水合，避免首帧与迁移逻辑竞态
      skipHydration: true,
      storage: createJSONStorage(() => (isIndexedDbAvailable() ? idbStorage : createMemoryStorage())),
      partialize: (state): AppData => ({
        persons: state.persons,
        schedules: state.schedules,
        activeScheduleId: state.activeScheduleId,
      }),
      migrate: (persisted, version) => {
        if (version < STORE_VERSION) return normalizeAppData(persisted) as Partial<AppStore>;
        return persisted as Partial<AppStore>;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

/* ------------------------------ 选择器 ------------------------------ */
// 组件一律通过这些选择器订阅，避免整棵树跟着任何一次变更重渲染。

export const usePersons = () => useAppStore(useShallow((s) => s.persons));
export const useSchedules = () => useAppStore(useShallow((s) => s.schedules));
export const useHydrated = () => useAppStore((s) => s.hydrated);
export const useActiveScheduleId = () => useAppStore((s) => s.activeScheduleId);
export const useActiveSchedule = () =>
  useAppStore((s) => s.schedules.find((item) => item.id === s.activeScheduleId) ?? null);
export const useActivePersons = () =>
  useAppStore(useShallow((s) => s.persons.filter((p) => p.isActive && !p.archivedAt)));
export const useArchivedPersons = () => useAppStore(useShallow((s) => s.persons.filter((p) => p.archivedAt)));
export const usePersonLookup = () =>
  useAppStore(
    useShallow((s) => Object.fromEntries(s.persons.map((p) => [p.id, p])) as Record<string, Person>)
  );
export const useScheduleById = (id: string | null) =>
  useAppStore((s) => (id ? (s.schedules.find((item) => item.id === id) ?? null) : null));
