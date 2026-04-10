'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { Person, Schedule, AppState } from '@/types';

interface StoreState {
  // 应用状态
  persons: Person[];
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  versionHistory: any[];
  
  // 加载状态
  isLoaded: boolean;
  isSaving: boolean;
  
  // 操作方法
  loadState: () => void;
  addPerson: (person: Omit<Person, 'id' | 'order'>) => Person;
  updatePerson: (id: string, updates: Partial<Person>) => Person | null;
  deletePerson: (id: string) => boolean;
  reorderPersons: (orderedIds: string[]) => void;
  saveSchedule: (schedule: Schedule) => Schedule;
  deleteSchedule: (id: string) => boolean;
  setCurrentSchedule: (schedule: Schedule | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // 初始状态
  persons: [],
  schedules: [],
  currentSchedule: null,
  versionHistory: [],
  isLoaded: false,
  isSaving: false,
  
  // 加载状态
  loadState: () => {
    const state = storage.getState();
    set({
      persons: state.persons,
      schedules: state.schedules,
      currentSchedule: state.currentSchedule,
      versionHistory: state.versionHistory,
      isLoaded: true
    });
  },
  
  // 添加人员
  addPerson: (person) => {
    set({ isSaving: true });
    try {
      const newPerson = storage.addPerson(person);
      get().loadState();
      return newPerson;
    } finally {
      set({ isSaving: false });
    }
  },
  
  // 更新人员
  updatePerson: (id, updates) => {
    set({ isSaving: true });
    try {
      const updated = storage.updatePerson(id, updates);
      get().loadState();
      return updated;
    } finally {
      set({ isSaving: false });
    }
  },
  
  // 删除人员
  deletePerson: (id) => {
    set({ isSaving: true });
    try {
      const result = storage.deletePerson(id);
      get().loadState();
      return result;
    } finally {
      set({ isSaving: false });
    }
  },
  
  // 重新排序人员
  reorderPersons: (orderedIds) => {
    set({ isSaving: true });
    try {
      storage.reorderPersons(orderedIds);
      get().loadState();
    } finally {
      set({ isSaving: false });
    }
  },
  
  // 保存排班
  saveSchedule: (schedule) => {
    set({ isSaving: true });
    try {
      const saved = storage.saveSchedule(schedule);
      get().loadState();
      return saved;
    } finally {
      set({ isSaving: false });
    }
  },
  
  // 删除排班
  deleteSchedule: (id) => {
    set({ isSaving: true });
    try {
      const result = storage.deleteSchedule(id);
      get().loadState();
      return result;
    } finally {
      set({ isSaving: false });
    }
  },
  
  // 设置当前排班
  setCurrentSchedule: (schedule) => {
    set({ isSaving: true });
    try {
      storage.setCurrentSchedule(schedule);
      get().loadState();
    } finally {
      set({ isSaving: false });
    }
  }
}));
