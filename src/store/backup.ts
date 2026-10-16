'use client';

/**
 * JSON 备份：数据只存在浏览器里，没有导出/导入等于把身家性命押在「用户不清缓存」上。
 */
import { timestampForFilename } from '@/domain/date';
import { SCHEMA_VERSION, type AppData, type BackupFile } from '@/domain/types';
import { downloadTextFile } from '@/lib/download';
import { parseBackupFile } from './migrate';

export function buildBackupFile(data: AppData, now: Date = new Date()): BackupFile {
  return {
    app: 'onduty',
    schema: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
}

export function serializeBackup(data: AppData, now: Date = new Date()): string {
  return JSON.stringify(buildBackupFile(data, now), null, 2);
}

export function backupFilename(now: Date = new Date()): string {
  return `onduty-backup-${timestampForFilename(now)}.json`;
}

export function downloadBackup(data: AppData, now: Date = new Date()): void {
  downloadTextFile(backupFilename(now), serializeBackup(data, now));
}

export { parseBackupFile };
