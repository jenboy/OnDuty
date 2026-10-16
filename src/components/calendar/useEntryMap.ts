'use client';

import { useMemo } from 'react';
import type { DateKey } from '@/domain/date';
import type { Schedule, ScheduleEntry } from '@/domain/types';

/** 把排班表条目转成按日期索引的 Map，供日历与统计复用 */
export function useEntryMap(schedule: Pick<Schedule, 'entries'> | null): Map<DateKey, ScheduleEntry> {
  return useMemo(() => {
    const map = new Map<DateKey, ScheduleEntry>();
    for (const entry of schedule?.entries ?? []) map.set(entry.date, entry);
    return map;
  }, [schedule]);
}
