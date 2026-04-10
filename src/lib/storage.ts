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
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.useCloudStorage = this.checkCloudStorageAvailable();
    this.userData = this.loadFromStorage();
    this.currentUserId = this.loadAuth();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private checkCloudStorageAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    // 检查是否在 Cloudflare Pages 环境中
    return window.location.hostname !== 'localhost' && 
           window.location.hostname !== '127.0.0.1';
  }

  private async loadFromCloudStorage(userId: string): Promise<UserData> {
    try {
      const response = await fetch(`/api/data/${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Failed to load data from cloud:', error);
    }
    return defaultUserData;
  }

  private async saveToCloudStorage(userId: string, data: UserData): Promise<void> {
    try {
      await fetch(`/api/data/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to save data to cloud:', error);
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

  private async saveToStorage(): Promise<void> {
    this.saveToLocalStorage();
    
    if (this.useCloudStorage && this.currentUserId) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      this.saveTimeout = setTimeout(() => {
        this.saveToCloudStorage(this.currentUserId!, this.userData);
        this.saveTimeout = null;
      }, 1000);
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
    const user = this.userData.users.find(u => u.password === password);
    if (user) {
      this.currentUserId = user.id;
      user.lastLogin = new Date().toISOString();
      this.saveAuth(user.id);
      
      if (this.useCloudStorage) {
        const cloudData = await this.loadFromCloudStorage(user.id);
        if (cloudData.users.length > 0 || Object.keys(cloudData.dataByUser).length > 0) {
          this.userData = cloudData;
          this.saveToLocalStorage();
        } else {
          await this.saveToCloudStorage(user.id, this.userData);
        }
      }
      
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

  exportData(): string {
    if (!this.currentUserId) throw new Error('Not authenticated');
    return JSON.stringify(this.getCurrentUserState(), null, 2);
  }

  async importData(jsonData: string): Promise<boolean> {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    try {
      const data = JSON.parse(jsonData);
      const state = { ...defaultState, ...data };
      await this.setCurrentUserState(state);
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  async clearAll(): Promise<void> {
    if (!this.currentUserId) throw new Error('Not authenticated');
    this.userData.dataByUser[this.currentUserId] = { ...defaultState };
    await this.saveToStorage();
  }

  getState(): AppState {
    return this.getCurrentUserState();
  }
}

export const storage = StorageManager.getInstance();
