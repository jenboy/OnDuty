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

  private constructor() {
    this.userData = this.loadFromStorage();
    this.currentUserId = this.loadAuth();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private loadFromStorage(): UserData {
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
      console.error('Failed to load data from storage:', error);
    }
    return defaultUserData;
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.userData));
    } catch (error) {
      console.error('Failed to save data to storage:', error);
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
    return this.userData.dataByUser[this.currentUserId] || defaultState;
  }

  private setCurrentUserState(state: AppState): void {
    if (!this.currentUserId) return;
    this.userData.dataByUser[this.currentUserId] = state;
    this.saveToStorage();
  }

  // 用户管理
  login(password: string): boolean {
    const user = this.userData.users.find(u => u.password === password);
    if (user) {
      this.currentUserId = user.id;
      user.lastLogin = new Date().toISOString();
      this.saveAuth(user.id);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  register(password: string): boolean {
    if (this.userData.users.some(u => u.password === password)) {
      return false; // 密码已存在
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
    this.saveToStorage();
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

  // 人员管理
  getPersons(): Person[] {
    return this.getCurrentUserState().persons;
  }

  addPerson(person: Omit<Person, 'id' | 'order'>): Person {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
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
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const index = state.persons.findIndex(p => p.id === id);
    if (index === -1) return null;

    state.persons[index] = { ...state.persons[index], ...updates };
    this.setCurrentUserState(state);
    return state.persons[index];
  }

  deletePerson(id: string): boolean {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const index = state.persons.findIndex(p => p.id === id);
    if (index === -1) return false;

    state.persons.splice(index, 1);
    // 重新排序
    state.persons.forEach((p, i) => { p.order = i; });
    this.setCurrentUserState(state);
    return true;
  }

  reorderPersons(orderedIds: string[]): void {
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
    this.setCurrentUserState(state);
  }



  // 排班管理
  getSchedules(): Schedule[] {
    return this.getCurrentUserState().schedules;
  }

  getSchedule(id: string): Schedule | null {
    return this.getCurrentUserState().schedules.find(s => s.id === id) || null;
  }

  saveSchedule(schedule: Schedule): Schedule {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    // 保存版本历史
    this.saveVersion(schedule);

    const index = state.schedules.findIndex(s => s.id === schedule.id);
    if (index === -1) {
      state.schedules.push(schedule);
    } else {
      state.schedules[index] = schedule;
    }
    state.currentSchedule = schedule;
    this.setCurrentUserState(state);
    return schedule;
  }

  deleteSchedule(id: string): boolean {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    const index = state.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;

    state.schedules.splice(index, 1);
    if (state.currentSchedule?.id === id) {
      state.currentSchedule = null;
    }
    this.setCurrentUserState(state);
    return true;
  }

  setCurrentSchedule(schedule: Schedule | null): void {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    const state = this.getCurrentUserState();
    state.currentSchedule = schedule;
    this.setCurrentUserState(state);
  }

  getCurrentSchedule(): Schedule | null {
    return this.getCurrentUserState().currentSchedule;
  }

  // 版本管理
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

    // 只保留最近5个版本
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

  rollbackToVersion(versionId: string): Schedule | null {
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
      this.setCurrentUserState(state);
    }

    return schedule;
  }

  // 数据导出导入
  exportData(): string {
    if (!this.currentUserId) throw new Error('Not authenticated');
    return JSON.stringify(this.getCurrentUserState(), null, 2);
  }

  importData(jsonData: string): boolean {
    if (!this.currentUserId) throw new Error('Not authenticated');
    
    try {
      const data = JSON.parse(jsonData);
      const state = { ...defaultState, ...data };
      this.setCurrentUserState(state);
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // 清空数据
  clearAll(): void {
    if (!this.currentUserId) throw new Error('Not authenticated');
    this.userData.dataByUser[this.currentUserId] = { ...defaultState };
    this.saveToStorage();
  }

  // 获取完整状态
  getState(): AppState {
    return this.getCurrentUserState();
  }
}

export const storage = StorageManager.getInstance();
