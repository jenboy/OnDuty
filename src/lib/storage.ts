import { AppState, Person, Holiday, Schedule, VersionHistory } from '@/types';
import { generateId } from './utils';

const STORAGE_KEY = 'onduty-data';
const MAX_VERSIONS = 5;

const defaultState: AppState = {
  persons: [],
  holidays: [],
  schedules: [],
  currentSchedule: null,
  versionHistory: [],
};

export class StorageManager {
  private static instance: StorageManager;
  private state: AppState;

  private constructor() {
    this.state = this.loadFromStorage();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private loadFromStorage(): AppState {
    if (typeof window === 'undefined') return defaultState;
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...defaultState, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Failed to load data from storage:', error);
    }
    return defaultState;
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save data to storage:', error);
    }
  }

  // 人员管理
  getPersons(): Person[] {
    return this.state.persons;
  }

  addPerson(person: Omit<Person, 'id' | 'order'>): Person {
    const newPerson: Person = {
      ...person,
      id: generateId(),
      order: this.state.persons.length,
    };
    this.state.persons.push(newPerson);
    this.saveToStorage();
    return newPerson;
  }

  updatePerson(id: string, updates: Partial<Person>): Person | null {
    const index = this.state.persons.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.state.persons[index] = { ...this.state.persons[index], ...updates };
    this.saveToStorage();
    return this.state.persons[index];
  }

  deletePerson(id: string): boolean {
    const index = this.state.persons.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.state.persons.splice(index, 1);
    // 重新排序
    this.state.persons.forEach((p, i) => { p.order = i; });
    this.saveToStorage();
    return true;
  }

  reorderPersons(orderedIds: string[]): void {
    const orderedPersons: Person[] = [];
    orderedIds.forEach((id, index) => {
      const person = this.state.persons.find(p => p.id === id);
      if (person) {
        person.order = index;
        orderedPersons.push(person);
      }
    });
    this.state.persons = orderedPersons;
    this.saveToStorage();
  }

  // 节假日管理
  getHolidays(): Holiday[] {
    return this.state.holidays;
  }

  addHoliday(holiday: Omit<Holiday, 'id'>): Holiday {
    const newHoliday: Holiday = {
      ...holiday,
      id: generateId(),
    };
    this.state.holidays.push(newHoliday);
    this.saveToStorage();
    return newHoliday;
  }

  updateHoliday(id: string, updates: Partial<Holiday>): Holiday | null {
    const index = this.state.holidays.findIndex(h => h.id === id);
    if (index === -1) return null;

    this.state.holidays[index] = { ...this.state.holidays[index], ...updates };
    this.saveToStorage();
    return this.state.holidays[index];
  }

  deleteHoliday(id: string): boolean {
    const index = this.state.holidays.findIndex(h => h.id === id);
    if (index === -1) return false;

    this.state.holidays.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  // 排班管理
  getSchedules(): Schedule[] {
    return this.state.schedules;
  }

  getSchedule(id: string): Schedule | null {
    return this.state.schedules.find(s => s.id === id) || null;
  }

  saveSchedule(schedule: Schedule): Schedule {
    // 保存版本历史
    this.saveVersion(schedule);

    const index = this.state.schedules.findIndex(s => s.id === schedule.id);
    if (index === -1) {
      this.state.schedules.push(schedule);
    } else {
      this.state.schedules[index] = schedule;
    }
    this.state.currentSchedule = schedule;
    this.saveToStorage();
    return schedule;
  }

  deleteSchedule(id: string): boolean {
    const index = this.state.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.state.schedules.splice(index, 1);
    if (this.state.currentSchedule?.id === id) {
      this.state.currentSchedule = null;
    }
    this.saveToStorage();
    return true;
  }

  setCurrentSchedule(schedule: Schedule | null): void {
    this.state.currentSchedule = schedule;
    this.saveToStorage();
  }

  getCurrentSchedule(): Schedule | null {
    return this.state.currentSchedule;
  }

  // 版本管理
  private saveVersion(schedule: Schedule): void {
    const existingIndex = this.state.versionHistory.findIndex(
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
    const relatedVersions = this.state.versionHistory.filter(
      v => v.scheduleId === schedule.id
    );
    if (relatedVersions.length >= MAX_VERSIONS) {
      const oldestVersion = relatedVersions[relatedVersions.length - 1];
      const oldestIndex = this.state.versionHistory.findIndex(
        v => v.id === oldestVersion.id
      );
      if (oldestIndex !== -1) {
        this.state.versionHistory.splice(oldestIndex, 1);
      }
    }

    this.state.versionHistory.unshift(version);
  }

  getVersionHistory(scheduleId: string): VersionHistory[] {
    return this.state.versionHistory
      .filter(v => v.scheduleId === scheduleId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  rollbackToVersion(versionId: string): Schedule | null {
    const version = this.state.versionHistory.find(v => v.id === versionId);
    if (!version) return null;

    const schedule = JSON.parse(JSON.stringify(version.data));
    schedule.updatedAt = new Date().toISOString();

    const index = this.state.schedules.findIndex(s => s.id === schedule.id);
    if (index !== -1) {
      this.state.schedules[index] = schedule;
      this.state.currentSchedule = schedule;
      this.saveToStorage();
    }

    return schedule;
  }

  // 数据导出导入
  exportData(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      this.state = { ...defaultState, ...data };
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // 清空数据
  clearAll(): void {
    this.state = { ...defaultState };
    this.saveToStorage();
  }

  // 获取完整状态
  getState(): AppState {
    return { ...this.state };
  }
}

export const storage = StorageManager.getInstance();
