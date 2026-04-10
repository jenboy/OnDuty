import { AppState, Person, Schedule, VersionHistory, User, UserData } from '@/types';
import { generateId } from './utils';

// Cloudflare KV 绑定类型
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

declare global {
  var ONDUTY_KV: KVNamespace;
}

const STORAGE_KEY = 'onduty-data';
const AUTH_KEY = 'onduty-auth';
const MAX_VERSIONS = 5;

const defaultState: AppState = {
  persons: [],
  schedules: [],
  currentSchedule: null,
  versionHistory: [],
};

const defaultUserData: UserData = {
  users: [],
  dataByUser: {},
};

export class StorageManager {
  private static instance: StorageManager;
  private userData: UserData = defaultUserData;
  private currentUserId: string = 'default';
  private useCloudStorage: boolean = false;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      this.userData = await this.loadFromStorage();
      // 确保默认用户数据存在
      if (!this.userData.dataByUser[this.currentUserId]) {
        this.userData.dataByUser[this.currentUserId] = { ...defaultState };
      }
      this.isInitialized = true;
    }
  }

  private loadFromLocalStorage(): UserData {
    if (typeof window === 'undefined') return defaultUserData;
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          users: parsed.users || [],
          dataByUser: parsed.dataByUser || {},
        };
      }
    } catch (error) {
      console.error('Failed to load data from local storage:', error);
    }
    return defaultUserData;
  }

  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.userData));
    } catch (error) {
      console.error('Failed to save data to local storage:', error);
    }
  }

  private loadFromStorage(): UserData {
    return this.loadFromLocalStorage();
  }

  private saveToStorage(): void {
    this.saveToLocalStorage();
  }

  private getCurrentUserState(): AppState {
    const state = this.userData.dataByUser[this.currentUserId] || defaultState;
    return JSON.parse(JSON.stringify(state));
  }

  private setCurrentUserState(state: AppState): void {
    this.userData.dataByUser[this.currentUserId] = state;
    this.saveToStorage();
  }



  async getPersons(): Promise<Person[]> {
    await this.initialize();
    return this.getCurrentUserState().persons;
  }

  addPerson(person: Omit<Person, 'id' | 'order'>): Person {
    this.initialize();
    const state = this.getCurrentUserState();
    const newPerson: Person = {
      ...person,
      id: generateId(),
      order: state.persons.length,
    };
    state.persons.push(newPerson);
    this.setCurrentUserState(state);
    return newPerson;
  }

  updatePerson(id: string, updates: Partial<Person>): Person | null {
    this.initialize();
    const state = this.getCurrentUserState();
    const index = state.persons.findIndex(p => p.id === id);
    if (index === -1) return null;

    state.persons[index] = { ...state.persons[index], ...updates };
    this.setCurrentUserState(state);
    return state.persons[index];
  }

  deletePerson(id: string): boolean {
    this.initialize();
    const state = this.getCurrentUserState();
    const index = state.persons.findIndex(p => p.id === id);
    if (index === -1) return false;

    state.persons.splice(index, 1);
    state.persons.forEach((p, i) => { p.order = i; });
    this.setCurrentUserState(state);
    return true;
  }

  reorderPersons(orderedIds: string[]): void {
    this.initialize();
    const state = this.getCurrentUserState();
    const orderedPersons: Person[] = [];
    orderedIds.forEach((id, index) => {
      const person = state.persons.find(p => p.id === id);
      if (person) {
        person.order = index;
        orderedPersons.push(person);
      }
    });
    state.persons = orderedPersons;
    this.setCurrentUserState(state);
  }

  getSchedules(): Schedule[] {
    this.initialize();
    return this.getCurrentUserState().schedules;
  }

  getScheduleById(id: string): Schedule | null {
    this.initialize();
    return this.getCurrentUserState().schedules.find(s => s.id === id) || null;
  }

  saveSchedule(schedule: Schedule): Schedule {
    this.initialize();
    const state = this.getCurrentUserState();
    this.saveVersion(schedule);

    const index = state.schedules.findIndex(s => s.id === schedule.id);
    if (index === -1) {
      state.schedules.push(schedule);
    } else {
      state.schedules[index] = schedule;
    }
    this.setCurrentUserState(state);
    return schedule;
  }

  deleteSchedule(id: string): boolean {
    this.initialize();
    const state = this.getCurrentUserState();
    const index = state.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;

    state.schedules.splice(index, 1);
    this.setCurrentUserState(state);
    return true;
  }

  setCurrentSchedule(schedule: Schedule | null): void {
    this.initialize();
    const state = this.getCurrentUserState();
    state.currentSchedule = schedule;
    this.setCurrentUserState(state);
  }

  getCurrentSchedule(): Schedule | null {
    this.initialize();
    return this.getCurrentUserState().currentSchedule;
  }

  private saveVersion(schedule: Schedule): void {
    this.initialize();
    const state = this.getCurrentUserState();
    const existingIndex = state.versionHistory.findIndex(
      v => v.scheduleId === schedule.id
    );

    const version: VersionHistory = {
      id: generateId(),
      scheduleId: schedule.id,
      timestamp: new Date().toISOString(),
      action: existingIndex === -1 ? 'create' : 'update',
      data: JSON.parse(JSON.stringify(schedule)),
    };

    const relatedVersions = state.versionHistory.filter(
      v => v.scheduleId === schedule.id
    );
    if (relatedVersions.length >= MAX_VERSIONS) {
      const oldestVersion = relatedVersions[relatedVersions.length - 1];
      const oldestIndex = state.versionHistory.findIndex(
        v => v.id === oldestVersion.id
      );
      if (oldestIndex !== -1) {
        state.versionHistory.splice(oldestIndex, 1);
      }
    }

    state.versionHistory.unshift(version);
    this.setCurrentUserState(state);
  }

  getState(): AppState {
    this.initialize();
    return this.getCurrentUserState();
  }
}

export const storage = StorageManager.getInstance();
