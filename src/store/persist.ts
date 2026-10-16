'use client';

/**
 * zustand persist 的存储适配：IndexedDB（经 idb-keyval）。
 *
 * 为什么不用 localStorage：旧实现把所有排班表 + 全部日期条目塞进一个 5MB 的 key，
 * 写失败只 console.error（静默丢数据）。IndexedDB 容量大得多，且写入异步不阻塞渲染。
 */
import { del, get, set } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    const value = await get<string>(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

/** 无痕模式等场景下 IndexedDB 可能不可用；此时退回内存存储（数据当次会话有效） */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export function createMemoryStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: (name) => {
      map.delete(name);
    },
  };
}
