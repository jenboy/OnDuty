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

  const refreshState = useCallback(async () => {
    const loadedState = await storage.getState();
    setState(loadedState);
  }, []);

  useEffect(() => {
    const loadState = async () => {
      const loadedState = await storage.getState();
      setState(loadedState);
      setIsLoaded(true);
    };
    loadState();
  }, [refreshState]);

  const addPerson = useCallback(async (person: Omit<Person, 'id' | 'order'>) => {
    setIsSaving(true);
    try {
      const newPerson = await storage.addPerson(person);
      await refreshState();
      return newPerson;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const updatePerson = useCallback(async (id: string, updates: Partial<Person>) => {
    setIsSaving(true);
    try {
      const updated = await storage.updatePerson(id, updates);
      await refreshState();
      return updated;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deletePerson = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      const result = await storage.deletePerson(id);
      await refreshState();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const reorderPersons = useCallback(async (orderedIds: string[]) => {
    setIsSaving(true);
    try {
      await storage.reorderPersons(orderedIds);
      await refreshState();
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const saveSchedule = useCallback(async (schedule: Schedule) => {
    setIsSaving(true);
    try {
      const saved = await storage.saveSchedule(schedule);
      await refreshState();
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deleteSchedule = useCallback(async (id: string) => {
    setIsSaving(true);
    try {
      const result = await storage.deleteSchedule(id);
      await refreshState();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const setCurrentSchedule = useCallback(async (schedule: Schedule | null) => {
    setIsSaving(true);
    try {
      await storage.setCurrentSchedule(schedule);
      await refreshState();
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
  };
}
