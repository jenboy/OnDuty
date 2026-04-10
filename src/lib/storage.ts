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
  private currentUserId: string | null = null;
  private useCloudStorage: boolean = true;
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
      this.currentUserId = this.loadAuth();
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

  private async loadFromKVStorage(): Promise<UserData> {
    try {
      if (typeof window !== 'undefined' && (window as any).ONDUTY_KV) {
        const data = await (window as any).ONDUTY_KV.get('userData');
        if (data) {
          return JSON.parse(data);
        }
      }
    } catch (error) {
      console.error('Failed to load data from KV storage:', error);
    }
    return this.loadFromLocalStorage();
  }

  private async saveToKVStorage(data: UserData): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).ONDUTY_KV) {
        await (window as any).ONDUTY_KV.put('userData', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to save data to KV storage:', error);
    }
  }

  private async loadFromStorage(): Promise<UserData> {
    if (this.useCloudStorage) {
      return await this.loadFromKVStorage();
    }
    return this.loadFromLocalStorage();
  }

  private async saveToStorage(): Promise<void> {
    this.saveToLocalStorage();
    if (this.useCloudStorage) {
      await this.saveToKVStorage(this.userData);
    }
  }

  private loadAuth(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const auth = localStorage.getItem(AUTH_KEY);
      if (auth) {
        return JSON.parse(auth);
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    }
    return null;
  }

  private saveAuth(userId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(userId));
    } catch (error) {
      console.error('Failed to save auth:', error);
    }
  }

  private clearAuth(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
  }

  private getCurrentUserState(): AppState {
    if (!this.currentUserId) return defaultState;
    const state = this.userData.dataByUser[this.currentUserId] || defaultState;
    return JSON.parse(JSON.stringify(state));
  }

  private async setCurrentUserState(state: AppState): Promise<void> {
    if (!this.currentUserId) return;
    this.userData.dataByUser[this.currentUserId] = state;
    await this.saveToStorage();
  }

  async login(password: string): Promise<boolean> {
    await this.initialize();
    const user = this.userData.users.find(u => u.password === password);
    if (user) {
      this.currentUserId = user.id;
      user.lastLogin = new Date().toISOString();
      this.saveAuth(user.id);
      await this.saveToStorage();
      return true;
    }
    return false;
  }

  async register(password: string): Promise<boolean> {
    await this.initialize();
    if (this.userData.users.some(u => u.password === password)) {
      return false;
    }

    const newUser: User = {
      id: generateId(),
      password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    this.userData.users.push(newUser);
    this.userData.dataByUser[newUser.id] = { ...defaultState };
    this.currentUserId = newUser.id;
    this.saveAuth(newUser.id);
    await this.saveToStorage();
    return true;
  }

  logout(): void {
    this.currentUserId = null;
    this.clearAuth();
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  isAuthenticated(): boolean {
    return this.currentUserId !== null;
  }

  async getPersons(): Promise<Person[]> {
    await this.initialize();
    return this.getCurrentUserState().persons;
  }

  async addPerson(person: Omit<Person, 'id' | 'order'>): Promise<Person> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const newPerson: Person = {
      ...person,
      id: generateId(),
      order: state.persons.length,
    };
    state.persons.push(newPerson);
    await this.setCurrentUserState(state);
    return newPerson;
  }

  async updatePerson(id: string, updates: Partial<Person>): Promise<Person | null> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const index = state.persons.findIndex(p => p.id === id);
    if (index === -1) return null;

    state.persons[index] = { ...state.persons[index], ...updates };
    await this.setCurrentUserState(state);
    return state.persons[index];
  }

  async deletePerson(id: string): Promise<boolean> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const index = state.persons.findIndex(p => p.id === id);
    if (index === -1) return false;

    state.persons.splice(index, 1);
    state.persons.forEach((p, i) => { p.order = i; });
    await this.setCurrentUserState(state);
    return true;
  }

  async reorderPersons(orderedIds: string[]): Promise<void> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
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
    await this.setCurrentUserState(state);
  }

  async getSchedules(): Promise<Schedule[]> {
    await this.initialize();
    return this.getCurrentUserState().schedules;
  }

  async getSchedule(id: string): Promise<Schedule | null> {
    await this.initialize();
    return this.getCurrentUserState().schedules.find(s => s.id === id) || null;
  }

  async saveSchedule(schedule: Schedule): Promise<Schedule> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    await this.saveVersion(schedule);

    const index = state.schedules.findIndex(s => s.id === schedule.id);
    if (index === -1) {
      state.schedules.push(schedule);
    } else {
      state.schedules[index] = schedule;
    }
    state.currentSchedule = schedule;
    await this.setCurrentUserState(state);
    return schedule;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const index = state.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;

    state.schedules.splice(index, 1);
    if (state.currentSchedule?.id === id) {
      state.currentSchedule = null;
    }
    await this.setCurrentUserState(state);
    return true;
  }

  async setCurrentSchedule(schedule: Schedule | null): Promise<void> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    state.currentSchedule = schedule;
    await this.setCurrentUserState(state);
  }

  async getCurrentSchedule(): Promise<Schedule | null> {
    await this.initialize();
    return this.getCurrentUserState().currentSchedule;
  }

  private async saveVersion(schedule: Schedule): Promise<void> {
    await this.initialize();
    if (!this.currentUserId) throw new Error('Not authenticated');
    
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
    await this.setCurrentUserState(state);
  }

  async getState(): Promise<AppState> {
    await this.initialize();
    return this.getCurrentUserState();
  }
}

export const storage = StorageManager.getInstance();
