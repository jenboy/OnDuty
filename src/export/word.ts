/**
 * Word 导出：生成 Word 能直接打开的 HTML（.doc）。
 * 与旧实现的差别：所有插值都做 HTML 转义（旧代码把姓名/表名直接拼进 HTML，
 * 名字里带 & 或 < 会把文档结构弄坏），并复用同一份分月数据。
 */
import { daysInMonth, getMonthName } from '@/domain/date';
import { getDayLunar } from '@/domain/lunar';
import { groupEntriesByMonth } from '@/domain/stats';
import type { Person, Schedule, ScheduleEntry } from '@/domain/types';
import { downloadTextFile } from '@/lib/download';
import { exportFilename, pickQuote, type ExportOptions } from './shared';

const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六'];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function exportScheduleToWord(
  schedule: Schedule,
  personLookup: Record<string, Person>,
  options: ExportOptions,
  now: Date = new Date()
): Promise<void> {
  const grouped = [...groupEntriesByMonth(schedule.entries).entries()].filter(([key]) => {
    if (options.scope !== 'current' || !options.currentMonth) return true;
    const { year, month0 } = options.currentMonth;
    return key === `${year}-${String(month0 + 1).padStart(2, '0')}`;
  });

  if (grouped.length === 0) throw new Error('这个范围内没有排班记录');

  const headerColor = `#${options.headerColor}`;
  let body = '';

  if (options.includeHeader) {
    body += `<div class="title">${escapeHtml(schedule.name)}</div>`;
    body += `<div class="subtitle">排班周期：${schedule.config.startDate} 至 ${schedule.config.endDate}</div>`;
  }

  for (const [key, entries] of grouped) {
    const [year, month] = key.split('-').map(Number);
    const month0 = month - 1;
    body += buildMonthTable(schedule, personLookup, year, month0, entries, headerColor);
  }

  if (options.includeQuote) {
    const quote = pickQuote(schedule.id);
    body += `<div class="quote">${escapeHtml(quote.content)}<div class="quote-from">—— ${escapeHtml(quote.from)}</div></div>`;
  }

  body += `<div class="footer">生成时间：${escapeHtml(now.toLocaleString('zh-CN'))}</div>`;

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(schedule.name)}</title>
<style>
  body { font-family: "Microsoft YaHei", SimSun, sans-serif; margin: 24px; color: #333; }
  .title { font-size: 24px; font-weight: bold; text-align: center; margin: 12px 0 4px; }
  .subtitle { font-size: 13px; text-align: center; color: #666; margin-bottom: 20px; }
  .month-title { font-size: 17px; font-weight: bold; text-align: center; margin: 24px 0 10px; }
  table { border-collapse: collapse; width: 100%; margin: 0 auto 24px; page-break-inside: avoid; }
  th, td { border: 1px solid #90a4ae; padding: 6px; text-align: center; vertical-align: middle; }
  th { background-color: ${headerColor}; color: #fff; font-size: 13px; }
  .day { font-size: 14px; font-weight: bold; }
  .lunar { font-size: 11px; color: #78909c; }
  .lunar.term { color: #2e7d32; }
  .duty { font-size: 13px; font-weight: bold; color: #fff; border-radius: 3px; padding: 2px 6px; display: inline-block; }
  .empty { color: #bdbdbd; font-size: 12px; }
  .quote { text-align: center; color: #666; font-size: 12px; margin-top: 24px; }
  .quote-from { color: #999; font-size: 11px; margin-top: 4px; }
  .footer { text-align: center; color: #999; font-size: 11px; margin-top: 16px; }
</style>
</head>
<body>${body}</body>
</html>`;

  downloadTextFile(exportFilename(schedule.name, 'doc', now), html, 'application/msword');
}

function buildMonthTable(
  schedule: Schedule,
  personLookup: Record<string, Person>,
  year: number,
  month0: number,
  entries: ScheduleEntry[],
  headerColor: string
): string {
  const monthName = getMonthName(month0);
  const total = daysInMonth(year, month0);
  const firstWeekday = new Date(year, month0, 1).getDay();
  const rows = Math.ceil((total + firstWeekday) / 7);
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));

  let html = `<div class="month-title">${year}年 ${monthName}</div><table><thead><tr>`;
  for (const label of WEEK_HEADERS) html += `<th>${label}</th>`;
  html += '</tr></thead><tbody>';

  let day = 1;
  for (let week = 0; week < rows; week++) {
    html += '<tr>';
    for (let weekday = 0; weekday < 7; weekday++) {
      const inMonth = !(week === 0 && weekday < firstWeekday) && day <= total;
      if (!inMonth) {
        html += '<td></td>';
        continue;
      }
      const key = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const lunar = getDayLunar(key);
      const entry = byDate.get(key);
      const person = entry?.personId ? personLookup[entry.personId] : undefined;

      html += `<td>
        <div class="day">${day}</div>
        <div class="lunar${lunar.jieQi ? ' term' : ''}">${escapeHtml(lunar.label)}</div>
        ${
          entry
            ? entry.personId
              ? `<div class="duty" style="background-color:${person?.color ?? '#3b82f6'}">${escapeHtml(person?.name ?? '（已删除的人员）')}</div>`
              : '<div class="empty">无人可排</div>'
            : ''
        }
      </td>`;
      day += 1;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}
