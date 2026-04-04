'use client';

import { useState, useMemo } from 'react';
import { Schedule, ScheduleEntry, Person } from '@/types';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMonthName, getWeekDayName, getDaysInMonth } from '@/lib/utils';

interface CalendarViewProps {
  schedule: Schedule | null;
  persons: Person[];
}

export function CalendarView({ schedule, persons }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // 获取当月排班数据
  const monthEntries = useMemo(() => {
    if (!schedule) return new Map<string, ScheduleEntry>();

    const entries = new Map<string, ScheduleEntry>();
    schedule.entries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      if (entryDate.getFullYear() === year && entryDate.getMonth() === month) {
        entries.set(entry.date, entry);
      }
    });
    return entries;
  }, [schedule, year, month]);

  // 获取人员颜色映射
  const personColors = useMemo(() => {
    const colors = new Map<string, string>();
    persons.forEach((p) => {
      colors.set(p.id, p.color || '#3b82f6');
    });
    return colors;
  }, [persons]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 生成日历格子
  const calendarDays = [];

  // 空白天数（上月）
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // 当月天数
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          日历视图
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-medium min-w-[120px] text-center">
            {year}年 {getMonthName(month)}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            今天
          </button>
        </div>
      </div>

      {!schedule ? (
        <div className="text-center py-12 text-gray-500">
          请先生成排班表
        </div>
      ) : (
        <>
          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-600 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日历格子 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square bg-gray-50 rounded-lg"
                  />
                );
              }

              const dateStr = `${year}-${String(month + 1).padStart(
                2,
                '0'
              )}-${String(day).padStart(2, '0')}`;
              const entry = monthEntries.get(dateStr);
              const isToday =
                new Date().toDateString() ===
                new Date(year, month, day).toDateString();
              const isWeekend =
                new Date(year, month, day).getDay() === 0 ||
                new Date(year, month, day).getDay() === 6;

              return (
                <div
                  key={day}
                  className={`aspect-square p-2 rounded-lg border transition-all ${
                    isToday
                      ? 'border-blue-500 bg-blue-50'
                      : isWeekend
                      ? 'border-gray-100 bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col h-full">
                    <span
                      className={`text-sm font-medium ${
                        isToday
                          ? 'text-blue-600'
                          : isWeekend
                          ? 'text-gray-400'
                          : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </span>
                    {entry && (
                      <div className="flex-1 flex items-center justify-center">
                        <div
                          className="text-xs font-medium px-2 py-1 rounded-full text-white truncate max-w-full"
                          style={{
                            backgroundColor:
                              personColors.get(entry.personId) || '#3b82f6',
                          }}
                        >
                          {entry.personName}
                        </div>
                      </div>
                    )}
                    {entry?.isHoliday && (
                      <div className="text-xs text-red-500 text-center mt-1 truncate">
                        {entry.holidayName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 图例 */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">今天</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <span className="text-sm text-gray-600">周末</span>
            </div>
            {persons
              .filter((p) => schedule.personIds.includes(p.id))
              .map((person) => (
                <div key={person.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: person.color || '#3b82f6' }}
                  />
                  <span className="text-sm text-gray-600">{person.name}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
