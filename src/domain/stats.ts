/**
 * 统计：只做纯计算，配色与姓名由视图层从人员名册取。
 * 统计口径是「有排班的天数」（周模式下一个人会占满该块的工作日，天数因此是 7 的倍数左右）。
 */
import type { Person, Schedule, ScheduleEntry } from './types';
import { fromKey } from './date';

export interface PersonCount {
  personId: string;
  name: string;
  color: string;
  days: number;
}

export interface ScheduleStats {
  /** 按天数从多到少 */
  perPerson: PersonCount[];
  /** 有排班的总天数 */
  assignedDays: number;
  /** 无人可用的天数 */
  unassignedDays: number;
  /** 参与过排班的人数（含已归档的人） */
  involvedPersons: number;
}

/** 把 entries 按自然月分组，键为 'YYYY-MM'；用于导出分表 */
export function groupEntriesByMonth(entries: readonly ScheduleEntry[]): Map<string, ScheduleEntry[]> {
  const out = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const date = fromKey(entry.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const list = out.get(key);
    if (list) list.push(entry);
    else out.set(key, [entry]);
  }
  return out;
}

export function collectStats(
  schedule: Pick<Schedule, 'entries'>,
  persons: readonly Person[],
  filter?: (entry: ScheduleEntry) => boolean
): ScheduleStats {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const counts = new Map<string, number>();
  let assignedDays = 0;
  let unassignedDays = 0;

  for (const entry of schedule.entries) {
    if (filter && !filter(entry)) continue;
    if (!entry.personId) {
      unassignedDays += 1;
      continue;
    }
    assignedDays += 1;
    counts.set(entry.personId, (counts.get(entry.personId) ?? 0) + 1);
  }

  const perPerson: PersonCount[] = [...counts.entries()]
    .map(([personId, days]) => {
      const person = byId.get(personId);
      return {
        personId,
        name: person?.name ?? '（已删除的人员）',
        color: person?.color ?? '#3b82f6',
        days,
      };
    })
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name, 'zh-Hans-CN'));

  return { perPerson, assignedDays, unassignedDays, involvedPersons: perPerson.length };
}

/** 某个自然月的统计（year 为公历年，month0 为 0-11） */
export function collectMonthStats(
  schedule: Pick<Schedule, 'entries'>,
  persons: readonly Person[],
  year: number,
  month0: number
): ScheduleStats {
  return collectStats(schedule, persons, (entry) => {
    const date = fromKey(entry.date);
    return date.getFullYear() === year && date.getMonth() === month0;
  });
}

/** 排班表覆盖的自然月列表，如 ['2026-04', '2026-05'] */
export function monthsOf(schedule: Pick<Schedule, 'entries'>): string[] {
  return [...groupEntriesByMonth(schedule.entries).keys()].sort();
}
