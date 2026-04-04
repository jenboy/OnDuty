'use client';

import { useState, useMemo, useRef } from 'react';
import { Schedule, ScheduleEntry, Person, ExportOptions } from '@/types';
import { ChevronLeft, ChevronRight, Calendar, BarChart3, TrendingUp, Download, FileText, FileSpreadsheet, FileType, FileCode, Settings, X } from 'lucide-react';
import { getMonthName, getDaysInMonth } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ExportManager } from '@/lib/export';
import html2canvas from 'html2canvas';

interface CalendarViewProps {
  schedule: Schedule | null;
  persons: Person[];
}

interface MonthlyStats {
  personId: string;
  personName: string;
  count: number;
  color: string;
}

export function CalendarView({ schedule, persons }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    template: 'standard',
    includeHeader: true,
    includeFooter: true,
    fontSize: 12,
    primaryColor: '#3b82f6',
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = new Date(year, month, 1).getDay();

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

  const monthlyStats = useMemo((): MonthlyStats[] => {
    if (!schedule) return [];

    const statsMap = new Map<string, number>();
    schedule.entries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      if (entryDate.getFullYear() === year && entryDate.getMonth() === month) {
        statsMap.set(entry.personId, (statsMap.get(entry.personId) || 0) + 1);
      }
    });

    const stats: MonthlyStats[] = [];
    statsMap.forEach((count, personId) => {
      const person = persons.find(p => p.id === personId);
      if (person) {
        stats.push({
          personId,
          personName: person.name,
          count,
          color: person.color || '#3b82f6',
        });
      }
    });

    return stats.sort((a, b) => b.count - a.count);
  }, [schedule, year, month, persons]);

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

  const handleExport = () => {
    if (!schedule) return;

    const exporter = new ExportManager(schedule, persons);

    switch (exportOptions.format) {
      case 'pdf':
        exporter.exportToPDF(exportOptions);
        break;
      case 'excel':
        exporter.exportToExcel(exportOptions);
        break;
      case 'word':
        exporter.exportToWord(exportOptions);
        break;
    }
    
    setShowExportModal(false);
  };



  const handleExportImage = async () => {
    if (!calendarRef.current) return;
    
    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `${schedule?.name || 'calendar'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出图片失败:', error);
    }
    
    setShowExportModal(false);
  };

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const maxCount = monthlyStats.length > 0 ? Math.max(...monthlyStats.map(s => s.count)) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          日历视图
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatsModal(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            统计
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
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

          <div className="grid grid-cols-7 gap-1" ref={calendarRef}>
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
                  </div>
                </div>
              );
            })}
          </div>

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

      {/* Stats Modal */}
      {showStatsModal && monthlyStats.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                {year}年{getMonthName(month)}值班统计
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {monthlyStats.map((stat) => (
                  <div key={stat.personId} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {stat.personName}
                        </span>
                        <span className="text-sm font-bold text-blue-600 ml-2">
                          {stat.count} 次
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${maxCount > 0 ? (stat.count / maxCount) * 100 : 0}%`,
                            backgroundColor: stat.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-gray-600">本月总值班次数</span>
                <span className="font-bold text-blue-700 text-lg">
                  {monthlyStats.reduce((sum, s) => sum + s.count, 0)} 次
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                导出排班表
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择导出格式
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setExportOptions({ ...exportOptions, format: 'excel' });
                      handleExport();
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-gray-600 transition-all"
                  >
                    <FileSpreadsheet className="w-8 h-8" />
                    <span className="text-sm font-medium">Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      setExportOptions({ ...exportOptions, format: 'word' });
                      handleExport();
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-gray-600 transition-all"
                  >
                    <FileType className="w-8 h-8" />
                    <span className="text-sm font-medium">Word</span>
                  </button>
                  <button
                    onClick={handleExportImage}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-gray-600 transition-all"
                  >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">图片</span>
                  </button>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}
    </div>
  );
}
