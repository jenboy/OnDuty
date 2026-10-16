import { describe, expect, it } from 'vitest';
import {
  addDays,
  eachDay,
  formatChineseDate,
  fromKey,
  isDateKey,
  isWeekendKey,
  monthEndKey,
  monthMatrix,
  monthStartKey,
  timestampForFilename,
  toKey,
  weekdayOf,
} from './date';

describe('date：本地日历日 <-> 字符串', () => {
  it('往返不丢信息', () => {
    expect(toKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(toKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    const date = fromKey('2026-04-05');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 3, 5]);
    // 本地零点：不会被按 UTC 解析而整体偏移
    expect(date.getHours()).toBe(0);
  });

  it('拒绝非法日期键，而不是返回 Invalid Date', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', 'abc', '', '2026-04-05T00:00:00Z']) {
      expect(isDateKey(bad), bad).toBe(false);
      expect(() => fromKey(bad)).toThrow();
    }
    expect(isDateKey('2026-02-28')).toBe(true);
    expect(isDateKey('2028-02-29')).toBe(true); // 闰年
  });

  it('加减天数跨月跨年正确', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('eachDay 是闭区间，且区间反转时为空', () => {
    expect(eachDay('2026-04-28', '2026-05-02')).toEqual([
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
      '2026-05-01',
      '2026-05-02',
    ]);
    expect(eachDay('2026-05-02', '2026-04-28')).toEqual([]);
    expect(eachDay('2026-04-01', '2026-04-01')).toEqual(['2026-04-01']);
  });
});

describe('date：星期与周末', () => {
  it('与 JS 原生星期一致（0=周日）', () => {
    expect(weekdayOf('2026-01-01')).toBe(4); // 周四
    expect(weekdayOf('2026-04-01')).toBe(3); // 周三
    expect(weekdayOf('2026-04-04')).toBe(6); // 周六
    expect(isWeekendKey('2026-04-04')).toBe(true);
    expect(isWeekendKey('2026-04-05')).toBe(true); // 周日
    expect(isWeekendKey('2026-04-06')).toBe(false);
  });
});

describe('date：月份工具', () => {
  it('月首末日', () => {
    expect(monthStartKey('2026-04-17')).toBe('2026-04-01');
    expect(monthEndKey('2026-04-17')).toBe('2026-04-30');
    expect(monthEndKey('2028-02-10')).toBe('2028-02-29');
    expect(monthEndKey('2026-02-10')).toBe('2026-02-28');
  });

  it('日历矩阵：前置空位对齐星期、长度是 7 的倍数、含整月每一天', () => {
    const matrix = monthMatrix(2026, 3); // 2026 年 4 月，1 号是周三
    expect(matrix.slice(0, 3)).toEqual([null, null, null]);
    expect(matrix[3]).toBe('2026-04-01');
    expect(matrix.length % 7).toBe(0);
    expect(matrix.filter(Boolean)).toHaveLength(30);
    expect(matrix).toContain('2026-04-30');

    const feb = monthMatrix(2026, 1);
    expect(feb.filter(Boolean)).toHaveLength(28);
    expect(feb.length % 7).toBe(0);
  });
});

describe('date：展示格式', () => {
  it('中文日期与文件名时间戳', () => {
    expect(formatChineseDate('2026-04-05')).toBe('2026年4月5日');
    expect(timestampForFilename(new Date(2026, 3, 5, 9, 7))).toBe('20260405-0907');
  });
});
