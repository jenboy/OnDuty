/**
 * Excel 导出：write-excel-file（浏览器端、支持单元格样式）。
 *
 * 旧实现用 xlsx（SheetJS 社区版），它写入时会丢弃 `cell.s` 样式 —— 旧代码里那一大段
 * 字体/填充/边框设置其实一个都没生效。这里表头底色、加粗、边框、居中、行高都是真的。
 */
import writeXlsxFile, { type Sheet } from 'write-excel-file/browser';
import { daysInMonth, getMonthName } from '@/domain/date';
import { getDayLunar } from '@/domain/lunar';
import { groupEntriesByMonth } from '@/domain/stats';
import type { Person, Schedule, ScheduleEntry } from '@/domain/types';
import { exportFilename, pickQuote, type ExportOptions } from './shared';

const WEEK_HEADERS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const BORDER = { borderColor: '#B0BEC5', borderStyle: 'thin' as const };

export async function exportScheduleToExcel(
  schedule: Schedule,
  personLookup: Record<string, Person>,
  options: ExportOptions,
  now: Date = new Date()
): Promise<void> {
  const grouped = [...groupEntriesByMonth(schedule.entries).entries()];
  const months =
    options.scope === 'current' && options.currentMonth
      ? grouped.filter(([key]) => key === monthKey(options.currentMonth!))
      : grouped;

  if (months.length === 0) throw new Error('这个范围内没有排班记录');

  const sheets: Sheet<Blob>[] = months.map(([key, entries]) => {
    const [year, month] = key.split('-').map(Number);
    return buildMonthSheet(schedule, personLookup, year, month - 1, entries, options);
  });

  await writeXlsxFile(sheets).toFile(exportFilename(schedule.name, 'xlsx', now));
}

function monthKey(month: { year: number; month0: number }): string {
  return `${month.year}-${String(month.month0 + 1).padStart(2, '0')}`;
}

function buildMonthSheet(
  schedule: Schedule,
  personLookup: Record<string, Person>,
  year: number,
  month0: number,
  entries: ScheduleEntry[],
  options: ExportOptions
): Sheet<Blob> {
  const monthName = getMonthName(month0);
  const total = daysInMonth(year, month0);
  const firstWeekday = new Date(year, month0, 1).getDay();
  const rows = Math.ceil((total + firstWeekday) / 7);
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));

  const data: Sheet<string>['data'] = [];

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
        backgroundColor: `#${options.headerColor}22`,
      },
    ]);
  }

  data.push(
    WEEK_HEADERS.map((label) => ({
      value: label,
      type: String,
      fontWeight: 'bold' as const,
      textColor: '#FFFFFF',
      backgroundColor: `#${options.headerColor}`,
      align: 'center' as const,
      alignVertical: 'center' as const,
      height: 26,
      ...BORDER,
    }))
  );

  let day = 1;
  for (let week = 0; week < rows; week++) {
    const dateRow: (typeof data)[number] = [];
    const personRow: (typeof data)[number] = [];

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

      personRow.push(
        entry
          ? entry.personId
            ? {
                value: person?.name ?? '（已删除的人员）',
                type: String,
                wrap: true,
                align: 'center',
                alignVertical: 'center',
                fontWeight: 'bold',
                textColor: '#FFFFFF',
                backgroundColor: person?.color ?? '#3B82F6',
                height: 26,
                ...BORDER,
              }
            : {
                value: '无人可排',
                type: String,
                align: 'center',
                alignVertical: 'center',
                textColor: '#9E9E9E',
                backgroundColor: '#F5F5F5',
                height: 26,
                ...BORDER,
              }
          : { value: '', type: String, height: 26, ...BORDER }
      );

      day += 1;
    }

    data.push(dateRow, personRow);
  }

  if (options.includeQuote) {
    const quote = pickQuote(schedule.id);
    data.push([]);
    data.push([
      {
        value: quote.content,
        type: String,
        align: 'center',
        textColor: '#666666',
        fontSize: 11,
        columnSpan: 7,
      },
    ]);
    data.push([
      {
        value: `—— ${quote.from}`,
        type: String,
        align: 'center',
        textColor: '#999999',
        fontSize: 10,
        columnSpan: 7,
      },
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
