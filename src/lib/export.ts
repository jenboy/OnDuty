import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Schedule, ScheduleEntry, ExportOptions } from '@/types';
import { getMonthName } from './utils';

export class ExportManager {
  private schedule: Schedule;

  constructor(schedule: Schedule) {
    this.schedule = schedule;
  }

  // 按月份分组数据
  private groupEntriesByMonth(entries: ScheduleEntry[]): Map<string, ScheduleEntry[]> {
    const monthlyData = new Map<string, ScheduleEntry[]>();
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)?.push(entry);
    });
    return monthlyData;
  }

  // 导出为 Excel (优化布局)
  exportToExcel(options: ExportOptions): void {
    const { entries } = this.schedule;

    // 按月份分组数据
    const monthlyData = this.groupEntriesByMonth(entries);

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
      
      // 为了快速匹配，先将当月entries转为Map
      const monthEntriesMap = new Map<string, ScheduleEntry>();
      monthEntries.forEach(entry => {
        monthEntriesMap.set(entry.date, entry);
      });
      
      // 动态计算日历所需行数
      // 公式逻辑：daysInMonth + firstDay 计算总单元格数
      // 除以7得到所需周数，Math.ceil确保向上取整
      const calendarRows = Math.ceil((daysInMonth + firstDay) / 7);
      
      // 计算需要的总行数
      const totalRows = (options.includeHeader ? 1 : 0) + 1 + calendarRows; // 标题行(可选) + 星期标题行 + 日历行
      
      // 创建工作表数据数组
      const data = Array(totalRows).fill(null).map(() => Array(7).fill(''));
      
      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // 设置列宽
      const colWidths = Array(7).fill({ wch: 15 });
      ws['!cols'] = colWidths;
      
      // 设置行高
      const rowHeights = [];
      if (options.includeHeader) {
        rowHeights.push({ hpx: 40 }); // 标题行
      }
      rowHeights.push({ hpx: 30 }); // 星期标题行
      for (let i = 0; i < calendarRows; i++) {
        rowHeights.push({ hpx: 80 }); // 日历行
      }
      // 确保行数与rowHeights数组长度一致
      ws['!rows'] = rowHeights;
      
      // 合并标题行
      if (options.includeHeader) {
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
        ];
        // 设置标题单元格样式
        const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
        ws[titleCell] = {
          v: `${year}年 ${monthName} 值日表`,
          t: 's',
          s: {
            font: { bold: true, sz: 16, color: { rgb: '4285F4' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: 'E3F2FD' } }
          }
        };
      }
      
      // 设置星期标题
      const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const weekHeaderRow = options.includeHeader ? 1 : 0;
      for (let c = 0; c < 7; c++) {
        const cell = XLSX.utils.encode_cell({ r: weekHeaderRow, c: c });
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
      
      // 设置日历数据和样式（只遍历一次）
      let startRow = options.includeHeader ? 2 : 1;
      let currentDay = 1;
      for (let i = 0; i < calendarRows; i++) {
        for (let j = 0; j < 7; j++) {
          if ((i === 0 && j < firstDay) || currentDay > daysInMonth) {
            // 空单元格
            const cell = XLSX.utils.encode_cell({ r: startRow + i, c: j });
            ws[cell] = {
              v: '',
              t: 's',
              s: {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { sz: 12 }
              }
            };
          } else {
            const cell = XLSX.utils.encode_cell({ r: startRow + i, c: j });
            const dateStr = `${year}-${month}-${String(currentDay).padStart(2, '0')}`;
            const entry = monthEntriesMap.get(dateStr);
            if (entry) {
              ws[cell] = {
                v: `${currentDay}\n${entry.personName}`,
                t: 's',
                s: {
                  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                  font: { sz: 12 }
                }
              };
            } else {
              ws[cell] = {
                v: String(currentDay),
                t: 's',
                s: {
                  alignment: { horizontal: 'center', vertical: 'center' },
                  font: { sz: 12 }
                }
              };
            }
            currentDay++;
          }
        }
        if (currentDay > daysInMonth) break;
      }
      
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // 生成文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${this.schedule.name}.xlsx`);
  }

  // 导出为 Word (优化排版)
  exportToWord(options: ExportOptions): void {
    const { entries } = this.schedule;

    // 按月份分组数据
    const monthlyData = this.groupEntriesByMonth(entries);

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${this.schedule.name}</title>
        <style>
          body { 
            font-family: "Microsoft YaHei", SimSun, sans-serif; 
            margin: 20px;
            line-height: 1.5;
          }
          .container { 
            max-width: 1000px; 
            margin: 0 auto;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 20px 0 40px 0;
            page-break-inside: avoid;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 15px; 
            text-align: center; 
            vertical-align: middle;
          }
          th { 
            background-color: ${options.primaryColor}; 
            color: white; 
            font-weight: bold;
            font-size: 14px;
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            text-align: center; 
            margin: 30px 0 10px 0;
            color: #333;
          }
          .subtitle { 
            font-size: 14px; 
            text-align: center; 
            margin: 0 0 30px 0; 
            color: #666;
          }
          .month-title { 
            font-size: 18px; 
            font-weight: bold; 
            text-align: center; 
            margin: 40px 0 15px 0;
            color: #333;
          }
          .calendar-cell { 
            height: 100px; 
            vertical-align: middle;
          }
          .day-number { 
            font-weight: bold; 
            margin-bottom: 8px;
            font-size: 16px;
          }
          .duty-person { 
            font-size: 14px;
            line-height: 1.3;
          }
          .footer { 
            text-align: center; 
            margin-top: 50px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
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
      
      // 动态计算日历所需行数
      // 公式逻辑：daysInMonth + firstDay 计算总单元格数
      // 除以7得到所需周数，Math.ceil确保向上取整
      const calendarRows = Math.ceil((daysInMonth + firstDay) / 7);
      
      // 为了快速匹配，先将当月entries转为Map
      const monthEntriesMap = new Map<string, ScheduleEntry>();
      monthEntries.forEach(entry => {
        monthEntriesMap.set(entry.date, entry);
      });
      
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
      let currentDay = 1;
      for (let i = 0; i < calendarRows; i++) {
        html += '<tr>';
        for (let j = 0; j < 7; j++) {
          if ((i === 0 && j < firstDay) || currentDay > daysInMonth) {
            html += '<td class="calendar-cell"></td>';
          } else {
            const dateStr = `${year}-${month}-${String(currentDay).padStart(2, '0')}`;
            const entry = monthEntriesMap.get(dateStr);
            if (entry) {
              html += `
                <td class="calendar-cell">
                  <div class="day-number">${currentDay}</div>
                  <div class="duty-person">${entry.personName}</div>
                </td>
              `;
            } else {
              html += `
                <td class="calendar-cell">
                  <div class="day-number">${currentDay}</div>
                </td>
              `;
            }
            currentDay++;
          }
        }
        html += '</tr>';
        if (currentDay > daysInMonth) break;
      }
      
      html += `
          </tbody>
        </table>
      `;
    });

    if (options.includeFooter) {
      html += `<div class="footer">生成时间: ${new Date().toLocaleString()}</div>`;
    }

    html += `
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['﻿', html], {
      type: 'application/msword',
    });
    saveAs(blob, `${this.schedule.name}.doc`);
  }




}
