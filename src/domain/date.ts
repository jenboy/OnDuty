/**
 * 日期工具：全项目只认「'YYYY-MM-DD' 的本地日历日」。
 *
 * 旧实现同时用 formatDate()（本地时间）写、用 new Date('2026-04-01')（按 UTC 解析）读，
 * 在 UTC 以西的时区会整体错一天。这里所有转换都显式按本地时间构造，不经过 Date 的字符串解析。
 */
import type { Weekday } from './types';

/** 'YYYY-MM-DD' */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD'（按本地日历日） */
export function toKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → 本地零点的 Date；非法输入抛错（不返回 Invalid Date 让它静默传播） */
export function fromKey(key: DateKey): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`非法日期键：${key}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`非法日期键：${key}`);
  }
  return date;
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false;
  try {
    fromKey(value);
    return true;
  } catch {
    return false;
  }
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return toKey(date);
}

/** 闭区间 [start, end] 的每一天；start > end 时返回空数组 */
export function eachDay(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = [];
  if (start > end) return out;
  let cursor = start;
  // 用字符串比较做上界判断，避免反复构造 Date
  while (cursor <= end) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function weekdayOf(key: DateKey): Weekday {
  return fromKey(key).getDay() as Weekday;
}

export function isWeekendKey(key: DateKey): boolean {
  const day = weekdayOf(key);
  return day === 0 || day === 6;
}

/** 该日期所在月的最后一天 */
export function monthEndKey(key: DateKey): DateKey {
  const date = fromKey(key);
  return toKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function monthStartKey(key: DateKey): DateKey {
  const date = fromKey(key);
  return toKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * 日历网格：周日开头，前置空格用 null 占位。
 * 视图层与三种导出共用这一份实现（旧代码把这段逻辑写了三遍）。
 */
export function monthMatrix(year: number, month0: number): (DateKey | null)[] {
  const firstWeekday = new Date(year, month0, 1).getDay();
  const total = daysInMonth(year, month0);
  const cells: (DateKey | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= total; day++) cells.push(`${year}-${pad(month0 + 1)}-${pad(day)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** '2026-04-05' → '2026年4月5日' */
export function formatChineseDate(key: DateKey): string {
  const d = fromKey(key);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** '2026-04-05' → '4月5日' */
export function formatShortChineseDate(key: DateKey): string {
  const d = fromKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 用于文件名：'20260405-1530' */
export function timestampForFilename(date = new Date()): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

export const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

export function weekdayName(day: Weekday): string {
  return WEEKDAY_NAMES[day];
}

export const MONTH_NAMES = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
] as const;

/** month0 为 0-11 */
export function getMonthName(month0: number): string {
  return MONTH_NAMES[month0] ?? `${month0 + 1}月`;
}

/** 该日期是当月第几周（用于「2026年4月第2周值日表」这类命名） */
export function getWeekOfMonth(key: DateKey): number {
  const date = fromKey(key);
  const firstWeekday = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + firstWeekday) / 7);
}
