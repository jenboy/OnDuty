/**
 * Excel 工作表的纯构造逻辑（不含写入器，方便在 Node 里做单元测试）。
 *
 * 两条硬约束（都踩过）：
 * 1. 颜色必须是 6 位（RGB）或 8 位（ARGB）十六进制。旧代码用 `${headerColor}22` 做浅色底，
 *    写进 xlsx 变成 `FF3498DB22`（10 位）这种非法值，WPS/Excel 打开会判文件异常、显示空表；
 * 2. 非法规格不写进去 —— 这里的 sanitizeColor 会拦一道。
 */
import { daysInMonth, getMonthName } from '@/domain/date';
import { getDayLunar } from '@/domain/lunar';
import { groupEntriesByMonth } from '@/domain/stats';
import type { Person, Schedule, ScheduleEntry } from '@/domain/types';
import type { Sheet } from 'write-excel-file/browser';
import { pickQuote, type ExportOptions } from './shared';

const WEEK_HEADERS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const BORDER = { borderColor: '#B0BEC5', borderStyle: 'thin' as const };
const FALLBACK_PERSON_COLOR = '#3B82F6';

/** 表头底色的浅色搭配（必须是 6 位十六进制） */
const HEADER_TINTS: Record<string, string> = {
  '3498DB': 'EAF4FD',
  '27AE60': 'E8F6EE',
  '8E44AD': 'F3EAF8',
  '34495E': 'ECEFF1',
};
const FALLBACK_TINT = 'F5F5F5';

/** 只接受 6 位十六进制（xlsx 的 RGB 形式）；其余一律回落，避免写出非法颜色 */
export function sanitizeHexColor(value: string | undefined, fallback: string): string {
  return value && /^#?[0-9A-Fa-f]{6}$/.test(value) ? `#${value.replace('#', '').toUpperCase()}` : fallback;
}

export function headerTint(headerColor: string): string {
  return `#${HEADER_TINTS[headerColor.replace('#', '').toUpperCase()] ?? FALLBACK_TINT}`;
}

export interface MonthSheetInput {
  schedule: Schedule;
  personLookup: Record<string, Person>;
  year: number;
  month0: number;
  entries: ScheduleEntry[];
  options: ExportOptions;
}

export function buildMonthSheet({ schedule, personLookup, year, month0, entries, options }: MonthSheetInput): Sheet<Blob> {
  const monthName = getMonthName(month0);
  const total = daysInMonth(year, month0);
  const firstWeekday = new Date(year, month0, 1).getDay();
  const weeks = Math.ceil((total + firstWeekday) / 7);
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const headerColor = sanitizeHexColor(options.headerColor ? `#${options.headerColor}` : undefined, '#3498DB');

  const data: Sheet<Blob>['data'] = [];

  if (options.includeHeader) {
    data.push([
      {
        value: `${year}年 ${monthName} 值日表`,
        type: String,
        fontWeight: 'bold',
        fontSize: 16,
        align: 'center',
        alignVertical: 'center',
        columnSpan: 7,
        height: 34,
        backgroundColor: headerTint(options.headerColor),
      },
    ]);
  }

  data.push(
    WEEK_HEADERS.map((label) => ({
      value: label,
      type: String,
      fontWeight: 'bold' as const,
      textColor: '#FFFFFF',
      backgroundColor: headerColor,
      align: 'center' as const,
      alignVertical: 'center' as const,
      height: 26,
      ...BORDER,
    }))
  );

  let day = 1;
  for (let week = 0; week < weeks; week++) {
    const dateRow: Sheet<Blob>['data'][number] = [];
    const personRow: Sheet<Blob>['data'][number] = [];

    for (let weekday = 0; weekday < 7; weekday++) {
      const inMonth = !(week === 0 && weekday < firstWeekday) && day <= total;
      if (!inMonth) {
        dateRow.push({ value: '', type: String, ...BORDER });
        personRow.push({ value: '', type: String, ...BORDER });
        continue;
      }

      const key = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const lunar = getDayLunar(key);
      const entry = byDate.get(key);
      const person = entry?.personId ? personLookup[entry.personId] : undefined;

      dateRow.push({
        value: `${day}\n${lunar.label}`,
        type: String,
        wrap: true,
        align: 'center',
        alignVertical: 'center',
        fontSize: 11,
        height: 34,
        ...BORDER,
      });

      if (!entry) {
        personRow.push({ value: '', type: String, height: 26, ...BORDER });
      } else if (entry.personId) {
        personRow.push({
          value: person?.name ?? '（已删除的人员）',
          type: String,
          wrap: true,
          align: 'center',
          alignVertical: 'center',
          fontWeight: 'bold',
          textColor: '#FFFFFF',
          backgroundColor: sanitizeHexColor(person?.color, FALLBACK_PERSON_COLOR),
          height: 26,
          ...BORDER,
        });
      } else {
        personRow.push({
          value: '无人可排',
          type: String,
          align: 'center',
          alignVertical: 'center',
          textColor: '#9E9E9E',
          backgroundColor: '#F5F5F5',
          height: 26,
          ...BORDER,
        });
      }

      day += 1;
    }

    data.push(dateRow, personRow);
  }

  if (options.includeQuote) {
    const quote = pickQuote(schedule.id);
    data.push([]);
    data.push([
      { value: quote.content, type: String, align: 'center', textColor: '#666666', fontSize: 11, columnSpan: 7 },
    ]);
    data.push([
      { value: `—— ${quote.from}`, type: String, align: 'center', textColor: '#999999', fontSize: 10, columnSpan: 7 },
    ]);
  }

  return {
    data,
    sheet: `${year}年${monthName}`,
    columns: Array.from({ length: 7 }, () => ({ width: 14 })),
    orientation: 'landscape',
    showGridLines: false,
  };
}

/** 按导出范围挑出要写的月份，并逐月构造工作表 */
export function buildScheduleSheets(
  schedule: Schedule,
  personLookup: Record<string, Person>,
  options: ExportOptions
): Sheet<Blob>[] {
  const grouped = [...groupEntriesByMonth(schedule.entries).entries()].filter(([key]) => {
    if (options.scope !== 'current' || !options.currentMonth) return true;
    const { year, month0 } = options.currentMonth;
    return key === `${year}-${String(month0 + 1).padStart(2, '0')}`;
  });

  return grouped.map(([key, entries]) => {
    const [year, month] = key.split('-').map(Number);
    return buildMonthSheet({ schedule, personLookup, year, month0: month - 1, entries, options });
  });
}
