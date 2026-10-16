import { describe, expect, it } from 'vitest';
import { clearLunarCache, getDayLunar, getMonthLunar } from './lunar';

/**
 * 官方对照：中国科学院紫金山天文台《二〇二六年日历资料》（按 GB/T 33661-2017 编制）。
 * 旧的手写实现 24 个里错了 12 个（小寒差1、大寒差2、芒种差2、大雪差2…），
 * 这组断言就是防止再退回去。
 */
const OFFICIAL_2026: Array<[string, string]> = [
  ['小寒', '2026-01-05'],
  ['大寒', '2026-01-20'],
  ['立春', '2026-02-04'],
  ['雨水', '2026-02-18'],
  ['惊蛰', '2026-03-05'],
  ['春分', '2026-03-20'],
  ['清明', '2026-04-05'],
  ['谷雨', '2026-04-20'],
  ['立夏', '2026-05-05'],
  ['小满', '2026-05-21'],
  ['芒种', '2026-06-05'],
  ['夏至', '2026-06-21'],
  ['小暑', '2026-07-07'],
  ['大暑', '2026-07-23'],
  ['立秋', '2026-08-07'],
  ['处暑', '2026-08-23'],
  ['白露', '2026-09-07'],
  ['秋分', '2026-09-23'],
  ['寒露', '2026-10-08'],
  ['霜降', '2026-10-23'],
  ['立冬', '2026-11-07'],
  ['小雪', '2026-11-22'],
  ['大雪', '2026-12-07'],
  ['冬至', '2026-12-22'],
];

describe('lunar：2026 年二十四节气对齐官方表', () => {
  it('24/24 全部落在官方日期上', () => {
    const actual = new Map<string, string>();
    for (let month = 0; month < 12; month++) {
      for (const [key, info] of getMonthLunar(2026, month)) {
        if (info.jieQi) actual.set(info.jieQi, key);
      }
    }
    const wrong: string[] = [];
    for (const [name, expected] of OFFICIAL_2026) {
      const got = actual.get(name);
      if (got !== expected) wrong.push(`${name}: 官方 ${expected}，实际 ${String(got)}`);
    }
    expect(wrong).toEqual([]);
    expect(actual.size).toBe(24);
  });
});

describe('lunar：农历日与显示约定', () => {
  it('春节等已知农历日正确', () => {
    clearLunarCache();
    expect(getDayLunar('2026-02-17').full).toBe('正月初一'); // 2026 年春节
    expect(getDayLunar('2026-03-03').full).toBe('正月十五'); // 元宵
    expect(getDayLunar('2026-06-19').full).toBe('五月初五'); // 端午
    expect(getDayLunar('2026-09-25').full).toBe('八月十五'); // 中秋
    expect(getDayLunar('2026-01-01').full).toBe('冬月十三');
  });

  it('节气当天 label 显示节气名，其余显示农历日；初一显示月名', () => {
    const term = getDayLunar('2026-04-05'); // 清明
    expect(term.jieQi).toBe('清明');
    expect(term.label).toBe('清明');

    expect(getDayLunar('2026-04-06').jieQi).toBeNull();
    expect(getDayLunar('2026-04-06').label).toBe('十九');

    expect(getDayLunar('2026-02-17').label).toBe('正月'); // 初一显示月名
  });

  it('整月结果与逐日结果一致（有缓存也不能串味）', () => {
    const month = getMonthLunar(2026, 3);
    expect(month.size).toBe(30);
    expect(month.get('2026-04-05')?.label).toBe(getDayLunar('2026-04-05').label);
  });
});
