import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Schedule, ScheduleEntry, ExportOptions, Person } from '@/types';
import { getMonthName } from './utils';

export class ExportManager {
  private schedule: Schedule;
  private persons: Person[];

  constructor(schedule: Schedule, persons: Person[]) {
    this.schedule = schedule;
    this.persons = persons;
  }

  // 导出为 Excel (优化布局)
  exportToExcel(options: ExportOptions): void {
    const { entries } = this.schedule;

    // 按月份分组数据
    const monthlyData = new Map<string, ScheduleEntry[]>();
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)?.push(entry);
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 为每个月份创建工作表
    monthlyData.forEach((monthEntries, monthKey) => {
      const [year, month] = monthKey.split('-');
      const monthName = getMonthName(parseInt(month) - 1);
      const sheetName = `${year}年${monthName}`;

      // 创建日历数据
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
      
      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet([]);
      
      // 设置列宽
      const colWidths = Array(7).fill({ wch: 15 });
      ws['!cols'] = colWidths;
      
      // 设置行高
      const rowHeights = [];
      
      // 添加标题
      let currentRow = 0;
      if (options.includeHeader) {
        // 标题行
        ws['!merges'] = [
          { s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 6 } }
        ];
        const titleCell = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
        ws[titleCell] = {
          v: `${year}年 ${monthName} 值日表`,
          t: 's',
          s: {
            font: { bold: true, sz: 16, color: { rgb: '4285F4' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: 'E3F2FD' } }
          }
        };
        rowHeights.push({ hpx: 40 });
        currentRow++;
      }
      
      // 添加星期标题
      const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      for (let c = 0; c < 7; c++) {
        const cell = XLSX.utils.encode_cell({ r: currentRow, c: c });
        ws[cell] = {
          v: weekDays[c],
          t: 's',
          s: {
            font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: '3B82F6' } }
          }
        };
      }
      rowHeights.push({ hpx: 30 });
      currentRow++;
      
      // 添加日历数据
      let day = 1;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
          if ((i === 0 && j < firstDay) || day > daysInMonth) {
            // 空单元格
            const cell = XLSX.utils.encode_cell({ r: currentRow, c: j });
            ws[cell] = {
              v: '',
              t: 's'
            };
          } else {
            const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
            const entry = monthEntries.find(e => e.date === dateStr);
            const cell = XLSX.utils.encode_cell({ r: currentRow, c: j });
            if (entry) {
              ws[cell] = {
                v: `${day}\n${entry.personName}`,
                t: 's',
                s: {
                  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                  font: { sz: 12 }
                }
              };
            } else {
              ws[cell] = {
                v: day.toString(),
                t: 'n',
                s: {
                  alignment: { horizontal: 'center', vertical: 'center' },
                  font: { sz: 12 }
                }
              };
            }
            day++;
          }
        }
        rowHeights.push({ hpx: 80 });
        currentRow++;
        if (day > daysInMonth) break;
      }
      
      ws['!rows'] = rowHeights;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // 生成文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${this.schedule.name}.xlsx`);
  }

  // 导出为 Word (日历排版)
  exportToWord(options: ExportOptions): void {
    const { entries } = this.schedule;

    // 按月份分组数据
    const monthlyData = new Map<string, ScheduleEntry[]>();
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)?.push(entry);
    });

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${this.schedule.name}</title>
        <style>
          body { font-family: "Microsoft YaHei", SimSun, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 40px; }
          th, td { border: 1px solid #000; padding: 12px; text-align: center; vertical-align: top; }
          th { background-color: ${options.primaryColor}; color: white; font-weight: bold; }
          .title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 15px; }
          .subtitle { font-size: 14px; text-align: center; margin-bottom: 30px; color: #666; }
          .month-title { font-size: 16px; font-weight: bold; text-align: center; margin: 20px 0 10px 0; }
          .calendar-cell { height: 80px; }
          .day-number { font-weight: bold; margin-bottom: 5px; }
          .duty-person { font-size: 12px; }
        </style>
      </head>
      <body>
    `;

    if (options.includeHeader) {
      html += `<div class="title">${this.schedule.name}</div>`;
      html += `<div class="subtitle">排班周期: ${this.schedule.config.startDate} 至 ${this.schedule.config.endDate}</div>`;
    }

    // 为每个月份生成日历
    monthlyData.forEach((monthEntries, monthKey) => {
      const [year, month] = monthKey.split('-');
      const monthName = getMonthName(parseInt(month) - 1);
      
      html += `<div class="month-title">${year}年${monthName}</div>`;
      
      // 创建日历数据
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
      
      html += `
        <table>
          <thead>
            <tr>
              <th>日</th>
              <th>一</th>
              <th>二</th>
              <th>三</th>
              <th>四</th>
              <th>五</th>
              <th>六</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      // 日历数据
      let day = 1;
      for (let i = 0; i < 6; i++) {
        html += '<tr>';
        for (let j = 0; j < 7; j++) {
          if ((i === 0 && j < firstDay) || day > daysInMonth) {
            html += '<td class="calendar-cell"></td>';
          } else {
            const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
            const entry = monthEntries.find(e => e.date === dateStr);
            if (entry) {
              html += `
                <td class="calendar-cell">
                  <div class="day-number">${day}</div>
                  <div class="duty-person">${entry.personName}</div>
                </td>
              `;
            } else {
              html += `
                <td class="calendar-cell">
                  <div class="day-number">${day}</div>
                </td>
              `;
            }
            day++;
          }
        }
        html += '</tr>';
        if (day > daysInMonth) break;
      }
      
      html += `
          </tbody>
        </table>
      `;
    });

    html += `
      </body>
      </html>
    `;

    const blob = new Blob(['﻿', html], {
      type: 'application/msword',
    });
    saveAs(blob, `${this.schedule.name}.doc`);
  }



  // 生成月度统计
  generateMonthlyStats(): { month: string; personStats: { name: string; count: number }[] }[] {
    const stats: Map<string, Map<string, number>> = new Map();

    this.schedule.entries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!stats.has(monthKey)) {
        stats.set(monthKey, new Map());
      }

      const monthStats = stats.get(monthKey)!;
      const current = monthStats.get(entry.personName) || 0;
      monthStats.set(entry.personName, current + 1);
    });

    return Array.from(stats.entries()).map(([month, personMap]) => ({
      month,
      personStats: Array.from(personMap.entries()).map(([name, count]) => ({
        name,
        count,
      })),
    }));
  }

  private getPersonDepartment(personId: string): string {
    const person = this.persons.find(p => p.id === personId);
    return person?.department || '';
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [59, 130, 246];
  }
}
