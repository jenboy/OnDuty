'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { Person, Holiday, Schedule, AppState } from '@/types';

export function useStorage() {
  const [state, setState] = useState<AppState>({
    persons: [],
    holidays: [],
    schedules: [],
    currentSchedule: null,
    versionHistory: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadedState = storage.getState();
    setState(loadedState);
    setIsLoaded(true);
  }, []);

  // 人员管理
  const addPerson = useCallback((person: Omit<Person, 'id' | 'order'>) => {
    const newPerson = storage.addPerson(person);
    setState(storage.getState());
    return newPerson;
  }, []);

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    const updated = storage.updatePerson(id, updates);
    setState(storage.getState());
    return updated;
  }, []);

  const deletePerson = useCallback((id: string) => {
    const result = storage.deletePerson(id);
    setState(storage.getState());
    return result;
  }, []);

  const reorderPersons = useCallback((orderedIds: string[]) => {
    storage.reorderPersons(orderedIds);
    setState(storage.getState());
  }, []);

  // 节假日管理
  const addHoliday = useCallback((holiday: Omit<Holiday, 'id'>) => {
    const newHoliday = storage.addHoliday(holiday);
    setState(storage.getState());
    return newHoliday;
  }, []);

  const updateHoliday = useCallback((id: string, updates: Partial<Holiday>) => {
    const updated = storage.updateHoliday(id, updates);
    setState(storage.getState());
    return updated;
  }, []);

  const deleteHoliday = useCallback((id: string) => {
    const result = storage.deleteHoliday(id);
    setState(storage.getState());
    return result;
  }, []);

  // 排班管理
  const saveSchedule = useCallback((schedule: Schedule) => {
    const saved = storage.saveSchedule(schedule);
    setState(storage.getState());
    return saved;
  }, []);

  const deleteSchedule = useCallback((id: string) => {
    const result = storage.deleteSchedule(id);
    setState(storage.getState());
    return result;
  }, []);

  const setCurrentSchedule = useCallback((schedule: Schedule | null) => {
    storage.setCurrentSchedule(schedule);
    setState(storage.getState());
  }, []);

  // 版本管理
  const rollbackToVersion = useCallback((versionId: string) => {
    const schedule = storage.rollbackToVersion(versionId);
    setState(storage.getState());
    return schedule;
  }, []);

  // 数据导入导出
  const exportData = useCallback(() => {
    return storage.exportData();
  }, []);

  const importData = useCallback((jsonData: string) => {
    const result = storage.importData(jsonData);
    setState(storage.getState());
    return result;
  }, []);

  const clearAll = useCallback(() => {
    storage.clearAll();
    setState(storage.getState());
  }, []);

  return {
    ...state,
    isLoaded,
    addPerson,
    updatePerson,
    deletePerson,
    reorderPersons,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    saveSchedule,
    deleteSchedule,
    setCurrentSchedule,
    rollbackToVersion,
    exportData,
    importData,
    clearAll,
  };
}
