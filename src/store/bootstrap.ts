'use client';

/**
 * 启动流程：水合 → （首次）迁移旧 localStorage → 报告结果。
 * 视图层在首屏调用一次，拿到报告后决定是否提示「已从旧版本迁移 N 张排班表」。
 */
import { useAppStore } from './useAppStore';
import { isIndexedDbAvailable } from './persist';
import {
  backupLegacyKey,
  buildMigration,
  readLegacyFromLocalStorage,
  type LegacyMigrationResult,
} from './migrate';

export interface BootstrapReport {
  migrated: boolean;
  /** 持久化后端；IndexedDB 不可用时为 'memory'（数据只在本次会话有效，务必提示用户导出备份） */
  storage: 'indexeddb' | 'memory';
  migration?: {
    summary: LegacyMigrationResult['summary'];
    backupKey: string;
  };
  legacyParseFailed?: boolean;
}

export async function bootstrapData(): Promise<BootstrapReport> {
  const storage: BootstrapReport['storage'] = isIndexedDbAvailable() ? 'indexeddb' : 'memory';

  if (!useAppStore.persist.hasHydrated()) {
    await useAppStore.persist.rehydrate();
  }

  const { persons, schedules } = useAppStore.getState();
  if (persons.length > 0 || schedules.length > 0) {
    return { migrated: false, storage };
  }

  const legacy = readLegacyFromLocalStorage();
  if (!legacy) return { migrated: false, storage };

  const migration = buildMigration(legacy.payload);
  if (!migration) return { migrated: false, storage, legacyParseFailed: true };

  useAppStore.getState().replaceAll(migration.data);
  backupLegacyKey(migration.backupKey);
  await useAppStore.persist.rehydrate();

  return {
    migrated: true,
    storage,
    migration: { summary: migration.summary, backupKey: migration.backupKey },
  };
}
