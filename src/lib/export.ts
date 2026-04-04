import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Schedule, ScheduleEntry, ExportOptions, Person } from '@/types';
import { getMonthName, getWeekDayName, formatDate } from './utils';

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
      getWeekDayName(new Date(entry.date).getDay()),
      entry.personName,
      entry.isHoliday ? entry.holidayName || '节假日' : '',
    ]);

    // 生成表格
    (doc as any).autoTable({
      startY: options.includeHeader ? 40 : 20,
      head: [['日期', '星期', '值班人员', '备注']],
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

  // 导出为 Excel
  exportToExcel(options: ExportOptions): void {
    const { entries } = this.schedule;

    // 准备数据
    const data = entries.map(entry => ({
      '日期': entry.date,
      '星期': getWeekDayName(new Date(entry.date).getDay()),
      '值班人员': entry.personName,
      '部门': this.getPersonDepartment(entry.personId),
      '是否节假日': entry.isHoliday ? '是' : '否',
      '节假日名称': entry.holidayName || '',
      '是否周末': entry.isWeekend ? '是' : '否',
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // 设置列宽
    const colWidths = [
      { wch: 12 },
      { wch: 8 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
    ];
    ws['!cols'] = colWidths;

    // 添加标题行
    if (options.includeHeader) {
      XLSX.utils.sheet_add_aoa(ws, [[this.schedule.name]], { origin: 'A1' });
      XLSX.utils.sheet_add_aoa(
        ws,
        [[`排班周期: ${this.schedule.config.startDate} 至 ${this.schedule.config.endDate}`]],
        { origin: 'A2' }
      );
      // 合并标题单元格
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      ];
    }

    XLSX.utils.book_append_sheet(wb, ws, '排班表');

    // 生成文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${this.schedule.name}.xlsx`);
  }

  // 导出为 Word (HTML格式)
  exportToWord(options: ExportOptions): void {
    const { entries } = this.schedule;

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${this.schedule.name}</title>
        <style>
          body { font-family: "Microsoft YaHei", SimSun, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: ${options.primaryColor}; color: white; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 10px; }
          .subtitle { font-size: 12px; text-align: center; margin-bottom: 20px; color: #666; }
        </style>
      </head>
      <body>
    `;

    if (options.includeHeader) {
      html += `<div class="title">${this.schedule.name}</div>`;
      html += `<div class="subtitle">排班周期: ${this.schedule.config.startDate} 至 ${this.schedule.config.endDate}</div>`;
    }

    html += `
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>星期</th>
            <th>值班人员</th>
            <th>部门</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
    `;

    entries.forEach(entry => {
      const weekDay = getWeekDayName(new Date(entry.date).getDay());
      const department = this.getPersonDepartment(entry.personId);
      const remark = entry.isHoliday ? entry.holidayName : '';

      html += `
        <tr>
          <td>${entry.date}</td>
          <td>${weekDay}</td>
          <td>${entry.personName}</td>
          <td>${department}</td>
          <td>${remark}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword',
    });
    saveAs(blob, `${this.schedule.name}.doc`);
  }

  // 导出为 JSON
  exportToJSON(): void {
    const data = {
      schedule: this.schedule,
      persons: this.persons.filter(p =>
        this.schedule.personIds.includes(p.id)
      ),
      exportTime: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, `${this.schedule.name}.json`);
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
