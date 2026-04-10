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
    const loadState = () => {
      const loadedState = storage.getState();
      setState(loadedState);
      setIsLoaded(true);
    };
    loadState();
  }, [refreshState]);

  const addPerson = useCallback((person: Omit<Person, 'id' | 'order'>) => {
    setIsSaving(true);
    try {
      const newPerson = storage.addPerson(person);
      refreshState();
      return newPerson;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    setIsSaving(true);
    try {
      const updated = storage.updatePerson(id, updates);
      refreshState();
      return updated;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deletePerson = useCallback((id: string) => {
    setIsSaving(true);
    try {
      const result = storage.deletePerson(id);
      refreshState();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const reorderPersons = useCallback((orderedIds: string[]) => {
    setIsSaving(true);
    try {
      storage.reorderPersons(orderedIds);
      refreshState();
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const saveSchedule = useCallback((schedule: Schedule) => {
    setIsSaving(true);
    try {
      const saved = storage.saveSchedule(schedule);
      refreshState();
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deleteSchedule = useCallback((id: string) => {
    setIsSaving(true);
    try {
      const result = storage.deleteSchedule(id);
      refreshState();
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const setCurrentSchedule = useCallback((schedule: Schedule | null) => {
    setIsSaving(true);
    try {
      storage.setCurrentSchedule(schedule);
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
  };
}
