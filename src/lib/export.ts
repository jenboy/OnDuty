import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Schedule, ScheduleEntry, ExportOptions } from '@/types';
import { getMonthName, getLunarDate } from './utils';

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

  // 获取时间戳
  public getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  // 获取名言
  private async getHitokoto(): Promise<{ content: string; from: string }> {
    try {
      // 添加超时控制，5秒后中止请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      console.log('Fetching hitokoto...');
      const response = await fetch('https://api.baiwumm.com/api/hitokoto', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch hitokoto: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Hitokoto API response:', result);
      
      const data = result.data || {};
      
      if (!data.content) {
        throw new Error('No content found in API response');
      }
      
      console.log('Hitokoto content:', data.content);
      console.log('Hitokoto from:', data.from);
      
      return {
        content: data.content,
        from: data.from || '未知来源'
      };
    } catch (error) {
      console.error('Error fetching hitokoto:', error);
      // 返回默认值
      return {
        content: '千万丈的大厦总要有片奠基石，最初的爱好无可替代。',
        from: '王小波「我的精神家园」'
      };
    }
  }

  // 导出为 Excel (优化布局)
  async exportToExcel(options: ExportOptions): Promise<void> {
    const { entries } = this.schedule;

    // 按月份分组数据
    const monthlyData = this.groupEntriesByMonth(entries);

    // 获取名言
    const hitokoto = await this.getHitokoto();

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
      const totalRows = (options.includeHeader ? 1 : 0) + 1 + calendarRows * 2 + 3; // 标题行(可选) + 星期标题行 + 日历行*2 + 底部引用
      
      // 创建工作表数据数组
      const data = Array(totalRows).fill(null).map(() => Array(7).fill(''));
      
      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // 设置列宽，适合A4横向打印
      ws['!cols'] = [
        { wch: 12 }, // 星期日
        { wch: 12 }, // 星期一
        { wch: 12 }, // 星期二
        { wch: 12 }, // 星期三
        { wch: 12 }, // 星期四
        { wch: 12 }, // 星期五
        { wch: 12 }  // 星期六
      ];
      
      // 设置页面设置为A4横向
      ws['!pageSetup'] = {
        orientation: 'landscape', // 横向
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      };
      
      // 设置默认单元格样式
      ws['!default'] = {
        s: {
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true
          }
        }
      };
      
      // 设置行高
      const rowHeights = [];
      if (options.includeHeader) {
        rowHeights.push({ hpx: 40 }); // 标题行
      }
      rowHeights.push({ hpx: 30 }); // 星期标题行
      for (let i = 0; i < calendarRows; i++) {
        rowHeights.push({ hpx: 40 }); // 日期和农历行
        rowHeights.push({ hpx: 40 }); // 人员名字行
      }
      // 底部引用行
      rowHeights.push({ hpx: 20 });
      rowHeights.push({ hpx: 20 });
      rowHeights.push({ hpx: 20 });
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
            font: { bold: true, sz: 16, color: { rgb: '000000' } },
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
            fill: { fgColor: { rgb: '3498DB' } }
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
            const dateCell = XLSX.utils.encode_cell({ r: startRow + i * 2, c: j });
            const nameCell = XLSX.utils.encode_cell({ r: startRow + i * 2 + 1, c: j });
            
            // 日期行
            ws[dateCell] = {
              v: '',
              t: 's',
              s: {
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                font: { sz: 12 }
              }
            };
            
            // 名字行
            ws[nameCell] = {
              v: '',
              t: 's',
              s: {
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                font: { sz: 12 }
              }
            };
          } else {
            const dateCell = XLSX.utils.encode_cell({ r: startRow + i * 2, c: j });
            const nameCell = XLSX.utils.encode_cell({ r: startRow + i * 2 + 1, c: j });
            const dateStr = `${year}-${month}-${String(currentDay).padStart(2, '0')}`;
            const entry = monthEntriesMap.get(dateStr);
            const date = new Date(parseInt(year), parseInt(month) - 1, currentDay);
            const lunarDate = getLunarDate(date);
            
            // 日期和农历行
            ws[dateCell] = {
              v: `${currentDay}\n${lunarDate}`,
              t: 's',
              s: {
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                font: { sz: 12 }
              }
            };
            
            // 人员名字行
            if (entry) {
              ws[nameCell] = {
                v: entry.personName,
                t: 's',
                s: {
                  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                  font: { sz: 12, bold: true }
                }
              };
            } else {
              ws[nameCell] = {
                v: '',
                t: 's',
                s: {
                  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                  font: { sz: 12 }
                }
              };
            }
            
            currentDay++;
          }
        }
        if (currentDay > daysInMonth) break;
      }
      
      // 添加底部引用
      const footerRow = startRow + calendarRows * 2;
      
      // 合并底部引用单元格
      if (ws['!merges']) {
        ws['!merges'].push({ s: { r: footerRow + 1, c: 0 }, e: { r: footerRow + 1, c: 6 } });
        ws['!merges'].push({ s: { r: footerRow + 2, c: 0 }, e: { r: footerRow + 2, c: 6 } });
      } else {
        ws['!merges'] = [
          { s: { r: footerRow + 1, c: 0 }, e: { r: footerRow + 1, c: 6 } },
          { s: { r: footerRow + 2, c: 0 }, e: { r: footerRow + 2, c: 6 } }
        ];
      }
      
      const footerCell = XLSX.utils.encode_cell({ r: footerRow + 1, c: 0 });
      ws[footerCell] = {
        v: hitokoto.content,
        t: 's',
        s: {
          font: { sz: 12, color: { rgb: '666666' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      };
      
      const authorCell = XLSX.utils.encode_cell({ r: footerRow + 2, c: 0 });
      ws[authorCell] = {
        v: `—— ${hitokoto.from}`,
        t: 's',
        s: {
          font: { sz: 12, color: { rgb: '666666' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      };
      
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // 生成文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${this.schedule.name}_${this.getTimestamp()}.xlsx`);
  }

  // 导出为 Word (优化排版)
  async exportToWord(options: ExportOptions): Promise<void> {
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
    saveAs(blob, `${this.schedule.name}_${this.getTimestamp()}.doc`);
  }




}
