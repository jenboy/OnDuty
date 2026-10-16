'use client';

/**
 * JSON 备份：数据只存在浏览器里，没有导出/导入等于把身家性命押在「用户不清缓存」上。
 */
import { timestampForFilename } from '@/domain/date';
import { SCHEMA_VERSION, type AppData, type BackupFile } from '@/domain/types';
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

/** 触发浏览器下载（不依赖 file-saver） */
export function downloadTextFile(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 交给下一帧释放，避免部分浏览器还没开始下载就被回收
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBackup(data: AppData, now: Date = new Date()): void {
  downloadTextFile(backupFilename(now), serializeBackup(data, now));
}

export { parseBackupFile };
