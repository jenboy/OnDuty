'use client';

/**
 * 日历网格：唯一一份实现，页面显示与三种导出都复用它。
 * 旧代码把这段矩阵逻辑写了三遍（CalendarView / Excel / Word），改一处漏两处。
 */
import { useMemo } from 'react';
import { getMonthLunar } from '@/domain/lunar';
import { monthMatrix, todayKey, type DateKey } from '@/domain/date';
import type { Person, ScheduleEntry } from '@/domain/types';
import { cn } from '@/lib/cn';

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];

export interface CalendarGridProps {
  year: number;
  month0: number;
  entries: Map<DateKey, ScheduleEntry>;
  personLookup: Record<string, Person>;
  onSelectDay?: (date: DateKey) => void;
  className?: string;
}

export function CalendarGrid({ year, month0, entries, personLookup, onSelectDay, className }: CalendarGridProps) {
  const days = useMemo(() => monthMatrix(year, month0), [year, month0]);
  const lunar = useMemo(() => getMonthLunar(year, month0), [year, month0]);
  const today = todayKey();

  return (
    <div className={className}>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEK_HEADERS.map((label) => (
          <div key={label} className="py-2 text-center text-sm font-medium text-gray-600">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="aspect-square rounded-lg bg-gray-50" />;

          const day = Number(date.slice(-2));
          const entry = entries.get(date);
          const person = entry?.personId ? personLookup[entry.personId] : undefined;
          const info = lunar.get(date);
          const weekday = new Date(year, month0, day).getDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const isToday = date === today;
          const unassigned = entry !== undefined && !entry.personId;

          const cell = (
            <>
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isToday ? 'text-blue-600' : isWeekend ? 'text-gray-400' : 'text-gray-700'
                  )}
                >
                  {day}
                </span>
                <span className={cn('truncate text-[11px]', info?.jieQi ? 'text-green-600' : 'text-gray-400')}>
                  {info?.label}
                </span>
              </div>
              <div className="mt-auto">
                {entry ? (
                  unassigned ? (
                    <span className="block truncate rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      无人可排
                    </span>
                  ) : (
                    <span
                      className="block truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: person?.color ?? '#3b82f6' }}
                      title={person ? `${person.name}${person.department ? ` · ${person.department}` : ''}` : ''}
                    >
                      {person?.name ?? '（已删除的人员）'}
                    </span>
                  )
                ) : null}
              </div>
            </>
          );

          const base =
            'flex aspect-square flex-col rounded-lg border p-1.5 text-left transition-colors ' +
            (isToday
              ? 'border-blue-500 bg-blue-50'
              : isWeekend
                ? 'border-gray-100 bg-gray-50'
                : 'border-gray-200 bg-white');

          return onSelectDay ? (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDay(date)}
              className={cn(base, 'hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500')}
              aria-label={`${date}${person ? ` 值班：${person.name}` : ''}`}
            >
              {cell}
            </button>
          ) : (
            <div key={date} className={base}>
              {cell}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 图例：只列这张排班表实际用到的人（旧代码把全部人员都列出来，含已停用的） */
export function CalendarLegend({ personIds, personLookup }: { personIds: string[]; personLookup: Record<string, Person> }) {
  if (personIds.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {personIds.map((id) => {
        const person = personLookup[id];
        return (
          <span key={id} className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: person?.color ?? '#3b82f6' }} />
            {person?.name ?? '（已删除的人员）'}
          </span>
        );
      })}
      <span className="flex items-center gap-1.5 text-sm text-gray-400">
        <span className="h-3 w-3 rounded-full bg-gray-200" />
        无人可排
      </span>
    </div>
  );
}
