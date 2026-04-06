'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { Person, Schedule, AppState } from '@/types';

export function useStorage() {
  const [state, setState] = useState<AppState>({
    persons: [],
    schedules: [],
    currentSchedule: null,
    versionHistory: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refreshState = useCallback(() => {
    const loadedState = storage.getState();
    setState(loadedState);
  }, []);

  useEffect(() => {
    const loadedState = storage.getState();
    setState(loadedState);
    setIsLoaded(true);
  }, [refreshState]);

  const addPerson = useCallback(async (person: Omit<Person, 'id' | 'order'>) => {
    setIsSaving(true);
    try {
      const newPerson = await storage.addPerson(person);
      refreshState();
      return newPerson;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const updatePerson = useCallback(async (id: string, updates: Partial<Person>) => {
    setIsSaving(true);
    try {
      const updated = await storage.updatePerson(id, updates);
      refreshState();
      return updated;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deletePerson = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      const result = await storage.deletePerson(id);
      refreshState();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const reorderPersons = useCallback(async (orderedIds: string[]) => {
    setIsSaving(true);
    try {
      await storage.reorderPersons(orderedIds);
      refreshState();
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const saveSchedule = useCallback(async (schedule: Schedule) => {
    setIsSaving(true);
    try {
      const saved = await storage.saveSchedule(schedule);
      refreshState();
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deleteSchedule = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      const result = await storage.deleteSchedule(id);
      refreshState();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const setCurrentSchedule = useCallback(async (schedule: Schedule | null) => {
    setIsSaving(true);
    try {
      await storage.setCurrentSchedule(schedule);
      refreshState();
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const rollbackToVersion = useCallback(async (versionId: string) => {
    setIsSaving(true);
    try {
      const schedule = await storage.rollbackToVersion(versionId);
      refreshState();
      return schedule;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const exportData = useCallback(() => {
    return storage.exportData();
  }, []);

  const importData = useCallback(async (jsonData: string) => {
    setIsSaving(true);
    try {
      const result = await storage.importData(jsonData);
      refreshState();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const clearAll = useCallback(async () => {
    setIsSaving(true);
    try {
      await storage.clearAll();
      refreshState();
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  return {
    ...state,
    isLoaded,
    isSaving,
    addPerson,
    updatePerson,
    deletePerson,
    reorderPersons,
    saveSchedule,
    deleteSchedule,
    setCurrentSchedule,
    rollbackToVersion,
    exportData,
    importData,
    clearAll,
  };
}
