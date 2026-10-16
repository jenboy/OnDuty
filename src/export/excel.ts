/**
 * Excel 导出：write-excel-file（浏览器端，支持单元格样式）。
 * 表结构在 excel-sheet.ts（纯函数，可在 Node 里测试），这里只负责写入与下载。
 */
import writeXlsxFile from 'write-excel-file/browser';
import type { Person, Schedule } from '@/domain/types';
import { buildScheduleSheets } from './excel-sheet';
import { exportFilename, type ExportOptions } from './shared';

export async function exportScheduleToExcel(
  schedule: Schedule,
  personLookup: Record<string, Person>,
  options: ExportOptions,
  now: Date = new Date()
): Promise<void> {
  const sheets = buildScheduleSheets(schedule, personLookup, options);
  if (sheets.length === 0) throw new Error('这个范围内没有排班记录');
  await writeXlsxFile(sheets).toFile(exportFilename(schedule.name, 'xlsx', now));
}
