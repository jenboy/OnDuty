import { AppState, Person, Schedule, VersionHistory, User, UserData } from '@/types';
import { generateId } from './utils';

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
  private userData: UserData;
  private currentUserId: string | null;
  private useCloudStorage: boolean;

  private constructor() {
    this.useCloudStorage = false;
    this.userData = this.loadFromStorage();
    this.currentUserId = this.loadAuth();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
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

  private async saveToStorage(): Promise<void> {
    this.saveToLocalStorage();
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

  getPersons(): Person[] {
    return this.getCurrentUserState().persons;
  }

  async addPerson(person: Omit<Person, 'id' | 'order'>): Promise<Person> {
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
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const index = state.persons.findIndex(p => p.id === id);
    if (index === -1) return null;

    state.persons[index] = { ...state.persons[index], ...updates };
    await this.setCurrentUserState(state);
    return state.persons[index];
  }

  async deletePerson(id: string): Promise<boolean> {
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

  getSchedules(): Schedule[] {
    return this.getCurrentUserState().schedules;
  }

  getSchedule(id: string): Schedule | null {
    return this.getCurrentUserState().schedules.find(s => s.id === id) || null;
  }

  async saveSchedule(schedule: Schedule): Promise<Schedule> {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    this.saveVersion(schedule);

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
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    state.currentSchedule = schedule;
    await this.setCurrentUserState(state);
  }

  getCurrentSchedule(): Schedule | null {
    return this.getCurrentUserState().currentSchedule;
  }

  private saveVersion(schedule: Schedule): void {
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
    this.setCurrentUserState(state);
  }

  getVersionHistory(scheduleId: string): VersionHistory[] {
    return this.getCurrentUserState().versionHistory
      .filter(v => v.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async rollbackToVersion(versionId: string): Promise<Schedule | null> {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const version = state.versionHistory.find(v => v.id === versionId);
    if (!version) return null;

    const schedule = JSON.parse(JSON.stringify(version.data));
    schedule.updatedAt = new Date().toISOString();

    const index = state.schedules.findIndex(s => s.id === schedule.id);
    if (index !== -1) {
      state.schedules[index] = schedule;
      state.currentSchedule = schedule;
      await this.setCurrentUserState(state);
    }

    return schedule;
  }



  getState(): AppState {
    return this.getCurrentUserState();
  }
}

export const storage = StorageManager.getInstance();
