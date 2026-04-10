import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

  // 导出为 PDF
  exportToPDF(options: ExportOptions): void {
    const doc = new jsPDF();
    const { entries } = this.schedule;

    // 设置字体（使用系统默认字体支持中文）
    doc.setFont('helvetica');

    // 标题
    if (options.includeHeader) {
      doc.setFontSize(options.fontSize + 8);
      doc.text(this.schedule.name, 14, 20);
      
      doc.setFontSize(options.fontSize);
      doc.text(
        `排班周期: ${this.schedule.config.startDate} 至 ${this.schedule.config.endDate}`,
        14,
        30
      );
    }

    // 准备表格数据
    const tableData = entries.map(entry => [
      entry.date,
      entry.personName,
    ]);

    // 生成表格
    (doc as any).autoTable({
      startY: options.includeHeader ? 40 : 20,
      head: [['日期', '值班人员']],
      body: tableData,
      theme: options.template === 'compact' ? 'plain' : 'grid',
      headStyles: {
        fillColor: this.hexToRgb(options.primaryColor),
        textColor: 255,
        fontSize: options.fontSize,
      },
      bodyStyles: {
        fontSize: options.fontSize - 2,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // 页脚
    if (options.includeFooter) {
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `第 ${i} 页，共 ${pageCount} 页`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }
    }

    // 保存文件
    doc.save(`${this.schedule.name}.pdf`);
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
      
      // 日历表格数据
      const calendarData = [];
      
      // 星期标题
      calendarData.push(['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']);
      
      // 日历数据
      let day = 1;
      for (let i = 0; i < 6; i++) {
        const week = [];
        for (let j = 0; j < 7; j++) {
          if ((i === 0 && j < firstDay) || day > daysInMonth) {
            week.push('');
          } else {
            const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
            const entry = monthEntries.find(e => e.date === dateStr);
            if (entry) {
              week.push(`${day}\n${entry.personName}`);
            } else {
              week.push(day.toString());
            }
            day++;
          }
        }
        calendarData.push(week);
        if (day > daysInMonth) break;
      }

      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet([]);
      
      // 添加标题
      if (options.includeHeader) {
        XLSX.utils.sheet_add_aoa(ws, [[`${year}年 ${monthName} 值日表`]], { origin: 'A1' });
        // 合并标题单元格
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        ];
      }
      
      // 添加日历数据
      XLSX.utils.sheet_add_aoa(ws, calendarData, { origin: options.includeHeader ? 'A2' : 'A1' });
      
      // 设置列宽和行高
      const colWidths = Array(7).fill({ wch: 15 });
      ws['!cols'] = colWidths;
      
      // 设置行高
      const rowHeights = [];
      // 标题行
      if (options.includeHeader) {
        rowHeights.push({ hpx: 40 });
      }
      // 星期标题行
      rowHeights.push({ hpx: 30 });
      // 日历行
      const weekCount = Math.ceil((firstDay + daysInMonth) / 7);
      for (let i = 0; i < weekCount; i++) {
        rowHeights.push({ hpx: 80 });
      }
      ws['!rows'] = rowHeights;
      
      // 设置单元格样式
      // 标题样式
      if (options.includeHeader) {
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
      
      // 星期标题样式
      const weekHeaderRow = options.includeHeader ? 1 : 0;
      for (let c = 0; c < 7; c++) {
        const cell = XLSX.utils.encode_cell({ r: weekHeaderRow, c: c });
        ws[cell] = {
          v: calendarData[0][c],
          t: 's',
          s: {
            font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { fgColor: { rgb: '3B82F6' } }
          }
        };
      }
      
      // 日历单元格样式
      const calendarStartRow = options.includeHeader ? 2 : 1;
      let dayCounter = 1;
      for (let i = 0; i < 6; i++) {
        const row = calendarStartRow + i;
        for (let j = 0; j < 7; j++) {
          if ((i === 0 && j < firstDay) || dayCounter > daysInMonth) {
            continue;
          }
          const cell = XLSX.utils.encode_cell({ r: row, c: j });
          const dateStr = `${year}-${month}-${String(dayCounter).padStart(2, '0')}`;
          const entry = monthEntries.find(e => e.date === dateStr);
          if (entry) {
            ws[cell] = {
              v: `${dayCounter}\n${entry.personName}`,
              t: 's',
              s: {
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                font: { sz: 12 }
              }
            };
          } else {
            ws[cell] = {
              v: dayCounter.toString(),
              t: 'n',
              s: {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { sz: 12 }
              }
            };
          }
          dayCounter++;
        }
        if (dayCounter > daysInMonth) break;
      }
      
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
