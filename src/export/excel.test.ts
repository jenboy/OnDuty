import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import writeXlsxFile from 'write-excel-file/node';
import type { Sheet } from 'write-excel-file/browser';
import type { Person, Schedule } from '@/domain/types';
import { DEFAULT_EXPORT_OPTIONS } from './shared';
import { buildScheduleSheets, headerTint, sanitizeHexColor } from './excel-sheet';

/**
 * 这组测试对应线上真出现过的故障：导出的 xlsx 打开是空表。
 * 当时的原因是浅色底写成了 10 位十六进制（`FF3498DB22`）这种非法颜色，
 * 于是这里从「颜色合法性」一路检查到「写出来的 zip 里样式与数据是否自洽」。
 */

const persons: Record<string, Person> = {
  p1: { id: 'p1', name: '张三', color: '#84CC16', isActive: true, order: 0, excludedDays: [], archivedAt: null },
  p2: { id: 'p2', name: '李四', color: '#3B82F6', isActive: true, order: 1, excludedDays: [], archivedAt: null },
};

const schedule: Schedule = {
  id: 's1',
  name: '2026年十月第3周值日表',
  createdAt: '2026-10-16T00:00:00.000Z',
  updatedAt: '2026-10-16T00:00:00.000Z',
  config: {
    startDate: '2026-10-16',
    endDate: '2026-11-02',
    rotationStrategy: 'sequential',
    dutyType: 'daily',
    skipWeekends: false,
    seed: 1,
  },
  personIds: ['p1', 'p2'],
  lastPersonId: 'p2',
  entries: [
    { date: '2026-10-16', personId: 'p1', isWeekend: false },
    { date: '2026-10-17', personId: 'p2', isWeekend: true },
    { date: '2026-10-18', personId: null, isWeekend: true },
    { date: '2026-10-19', personId: 'p1', isWeekend: false },
    { date: '2026-11-02', personId: 'p2', isWeekend: false },
  ],
};

describe('excel：颜色清洗', () => {
  it('只接受 6 位十六进制，其余回落', () => {
    expect(sanitizeHexColor('#84CC16', '#3B82F6')).toBe('#84CC16');
    expect(sanitizeHexColor('84cc16', '#3B82F6')).toBe('#84CC16');
    expect(sanitizeHexColor('#3498DB22', '#3B82F6')).toBe('#3B82F6'); // 当年写坏的那个
    expect(sanitizeHexColor('#FFF', '#3B82F6')).toBe('#3B82F6');
    expect(sanitizeHexColor(undefined, '#3B82F6')).toBe('#3B82F6');
  });

  it('表头浅色底始终是 6 位', () => {
    for (const color of ['3498DB', '27AE60', '8E44AD', '34495E', '不存在的色']) {
      expect(headerTint(color)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe('excel：工作表结构', () => {
  it('全部月份各一张表，表名与列宽正确', () => {
    const sheets = buildScheduleSheets(schedule, persons, DEFAULT_EXPORT_OPTIONS);
    expect(sheets.map((s) => s.sheet)).toEqual(['2026年十月', '2026年十一月']);
    for (const sheet of sheets) {
      expect(sheet.columns).toHaveLength(7);
      expect(sheet.orientation).toBe('landscape');
    }
  });

  it('只导当前月时只出一张表', () => {
    const sheets = buildScheduleSheets(schedule, persons, {
      ...DEFAULT_EXPORT_OPTIONS,
      scope: 'current',
      currentMonth: { year: 2026, month0: 9 },
    });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].sheet).toBe('2026年十月');
  });

  it('数据行里颜色一律合法（防止再写出 10 位色值）', () => {
    const sheets = buildScheduleSheets(schedule, persons, DEFAULT_EXPORT_OPTIONS);
    const colors: string[] = [];
    for (const sheet of sheets) {
      for (const row of sheet.data) {
        for (const cell of row) {
          if (cell && typeof cell === 'object' && 'backgroundColor' in cell && cell.backgroundColor) {
            colors.push(String(cell.backgroundColor));
          }
          if (cell && typeof cell === 'object' && 'textColor' in cell && cell.textColor) {
            colors.push(String(cell.textColor));
          }
        }
      }
    }
    expect(colors.length).toBeGreaterThan(10);
    for (const color of colors) expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('excel：真正写出来的文件', () => {
  it('zip 内含 cellXfs、所有样式索引都在范围内、姓名与日期都在', async () => {
    const sheets = buildScheduleSheets(schedule, persons, DEFAULT_EXPORT_OPTIONS);
    // 两种入口的类型只差在「图片内容的泛型」上，这里没有图片，直接转给 node 写入器
    const writable = sheets as unknown as Parameters<typeof writeXlsxFile>[0];
    const buffer = await writeXlsxFile(writable as Sheet<never>[]).toBuffer();

    const files = unzipSync(new Uint8Array(buffer));
    const styles = strFromU8(files['xl/styles.xml']);

    // 1) 样式表必须自洽：cellXfs 存在，且每个 s= 索引都能在其中找到
    const xfCount = Number(/<cellXfs count="(\d+)"/.exec(styles)?.[1] ?? 0);
    expect(xfCount).toBeGreaterThan(0);
    const sheetXml = strFromU8(files['xl/worksheets/sheet1.xml']);
    const styleRefs = [...sheetXml.matchAll(/ s="(\d+)"/g)].map((m) => Number(m[1]));
    expect(styleRefs.length).toBeGreaterThan(10);
    for (const index of styleRefs) expect(index).toBeLessThan(xfCount);

    // 2) 颜色必须是 6 位或 8 位十六进制（10 位就是当年那个 bug）
    for (const match of styles.matchAll(/rgb="([0-9A-Fa-f]+)"/g)) {
      expect([6, 8]).toContain(match[1].length);
    }

    // 3) 数据真的进去了
    const shared = strFromU8(files['xl/sharedStrings.xml']);
    expect(shared).toContain('张三');
    expect(shared).toContain('李四');
    expect(shared).toContain('2026年 十月 值日表');
    expect(shared).toContain('16\n初七'); // 日期行带农历
    expect(shared).toContain('无人可排'); // 无人可排的日期照实写出
    expect(strFromU8(files['xl/workbook.xml'])).toContain('2026年十月');
  });
});
