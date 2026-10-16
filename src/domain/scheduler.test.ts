import { describe, expect, it } from 'vitest';
import { generateSchedule } from './scheduler';
import { collectStats, groupEntriesByMonth } from './stats';
import type { Person, ScheduleConfig, ScheduleEntry } from './types';

function person(over: Partial<Person> & Pick<Person, 'id' | 'name'>): Person {
  return { isActive: true, order: 0, excludedDays: [], archivedAt: null, ...over };
}

function config(over: Partial<ScheduleConfig> = {}): ScheduleConfig {
  return {
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    rotationStrategy: 'sequential',
    dutyType: 'daily',
    skipWeekends: false,
    ...over,
  };
}

const FOUR = [
  person({ id: 'p1', name: '张三', order: 0 }),
  person({ id: 'p2', name: '李四', order: 1 }),
  person({ id: 'p3', name: '王五', order: 2 }),
  person({ id: 'p4', name: '赵六', order: 3 }),
];

function days(entries: ScheduleEntry[], personId: string): string[] {
  return entries.filter((e) => e.personId === personId).map((e) => e.date);
}

describe('scheduler：基本产出', () => {
  it('覆盖区间内每一天，并标记周末', () => {
    const { entries } = generateSchedule({ persons: FOUR, config: config() });
    expect(entries).toHaveLength(30);
    expect(entries[0]).toEqual({ date: '2026-04-01', personId: 'p1', isWeekend: false });
    expect(entries.find((e) => e.date === '2026-04-04')?.isWeekend).toBe(true);
    expect(entries.find((e) => e.date === '2026-04-06')?.isWeekend).toBe(false);
  });

  it('没有人员时给空结果并说明原因', () => {
    const result = generateSchedule({ persons: [], config: config() });
    expect(result.entries).toEqual([]);
    expect(result.warnings[0]).toContain('没有任何启用状态的人员');
  });

  it('停用与已归档的人不参与排班', () => {
    const persons = [
      ...FOUR,
      person({ id: 'off', name: '停用者', isActive: false, order: 4 }),
      person({ id: 'old', name: '归档者', archivedAt: '2026-01-01T00:00:00.000Z', order: 5 }),
    ];
    const { entries } = generateSchedule({ persons, config: config() });
    expect(days(entries, 'off')).toEqual([]);
    expect(days(entries, 'old')).toEqual([]);
  });
});

describe('scheduler：公平与连续', () => {
  it('30 天 4 个人，次数差不超过 1', () => {
    const { entries } = generateSchedule({ persons: FOUR, config: config() });
    const counts = FOUR.map((p) => days(entries, p.id).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('不会让同一个人连续两天值班', () => {
    const { entries } = generateSchedule({ persons: FOUR, config: config() });
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].personId).not.toBe(entries[i - 1].personId);
    }
  });

  it('只有一个人时必然连值，并给出告警', () => {
    const result = generateSchedule({ persons: [FOUR[0]], config: config() });
    expect(result.entries.every((e) => e.personId === 'p1')).toBe(true);
    expect(result.warnings.join()).toContain('连续值班');
  });

  it('跨表接续：不会把上一张表最后一天的人排到第一天', () => {
    const { entries } = generateSchedule({
      persons: FOUR,
      config: config(),
      previousPersonId: 'p1',
    });
    expect(entries[0].personId).not.toBe('p1');
    expect(entries[0].personId).toBe('p2');
  });
});

describe('scheduler：不可排班日与周末', () => {
  it('excludedDays 覆盖的星期绝不安排该人', () => {
    const persons = FOUR.map((p): Person => (p.id === 'p1' ? { ...p, excludedDays: [3] } : p));
    const { entries } = generateSchedule({ persons, config: config() });
    // 2026-04-01、08、15、22、29 都是周三
    for (const date of ['2026-04-01', '2026-04-08', '2026-04-15', '2026-04-22', '2026-04-29']) {
      expect(entries.find((e) => e.date === date)?.personId).not.toBe('p1');
    }
  });

  it('全员都不可排的那天记为「无人可用」并告警', () => {
    const persons = FOUR.map((p): Person => ({ ...p, excludedDays: [3] }));
    const result = generateSchedule({ persons, config: config() });
    const wednesdays = result.entries.filter((e) => e.date.endsWith('-01') || e.date.endsWith('-08'));
    expect(wednesdays.every((e) => e.personId === null)).toBe(true);
    expect(result.warnings.join()).toContain('没有任何可用人员');
    // 其它日子照常排班
    expect(result.entries.filter((e) => e.personId).length).toBeGreaterThan(20);
  });

  it('skipWeekends 时不产生周末条目', () => {
    const { entries } = generateSchedule({ persons: FOUR, config: config({ skipWeekends: true }) });
    expect(entries.some((e) => e.isWeekend)).toBe(false);
    expect(entries).toHaveLength(22); // 2026 年 4 月有 8 个周末日
  });

  it('区间内全是周末时给出提示', () => {
    const result = generateSchedule({
      persons: FOUR,
      config: config({ startDate: '2026-04-04', endDate: '2026-04-05', skipWeekends: true }),
    });
    expect(result.entries).toEqual([]);
    expect(result.warnings.join()).toContain('没有可排班的工作日');
  });
});

describe('scheduler：轮换策略', () => {
  it('正序与倒序的首日人选不同', () => {
    const seq = generateSchedule({ persons: FOUR, config: config({ rotationStrategy: 'sequential' }) });
    const rev = generateSchedule({ persons: FOUR, config: config({ rotationStrategy: 'reverse' }) });
    expect(seq.entries[0].personId).toBe('p1');
    expect(rev.entries[0].personId).toBe('p4');
  });

  it('随机策略在相同种子下结果完全一致，不同种子结果不同', () => {
    const base = config({ rotationStrategy: 'random', seed: 12345 });
    const a = generateSchedule({ persons: FOUR, config: base });
    const b = generateSchedule({ persons: FOUR, config: base });
    expect(a.entries).toEqual(b.entries);
    expect(a.seed).toBe(12345);

    const c = generateSchedule({ persons: FOUR, config: { ...base, seed: 999 } });
    expect(c.entries.map((e) => e.personId)).not.toEqual(a.entries.map((e) => e.personId));
  });
});

describe('scheduler：周模式', () => {
  it('每 7 天一个块，一块一个人', () => {
    const { entries } = generateSchedule({ persons: FOUR, config: config({ dutyType: 'weekly' }) });
    expect(entries).toHaveLength(30);
    const firstWeek = entries.filter((e) => e.date >= '2026-04-01' && e.date <= '2026-04-07');
    expect(new Set(firstWeek.map((e) => e.personId)).size).toBe(1);
    const secondWeek = entries.filter((e) => e.date >= '2026-04-08' && e.date <= '2026-04-14');
    expect(new Set(secondWeek.map((e) => e.personId)).size).toBe(1);
    expect(secondWeek[0].personId).not.toBe(firstWeek[0].personId);
  });
});

describe('stats：统计与分月', () => {
  it('已排/未排天数与 entries 对得上', () => {
    const persons = FOUR.map((p): Person => ({ ...p, excludedDays: [3] }));
    const schedule = { entries: generateSchedule({ persons, config: config() }).entries };
    const stats = collectStats(schedule, persons);
    expect(stats.assignedDays + stats.unassignedDays).toBe(schedule.entries.length);
    expect(stats.unassignedDays).toBe(5);
    expect(stats.perPerson.reduce((sum, item) => sum + item.days, 0)).toBe(stats.assignedDays);
    // 按天数降序
    const counts = stats.perPerson.map((item) => item.days);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('跨月区间按自然月分组', () => {
    const { entries } = generateSchedule({
      persons: FOUR,
      config: config({ startDate: '2026-04-28', endDate: '2026-05-03' }),
    });
    const groups = groupEntriesByMonth(entries);
    expect([...groups.keys()]).toEqual(['2026-04', '2026-05']);
    expect(groups.get('2026-04')).toHaveLength(3);
    expect(groups.get('2026-05')).toHaveLength(3);
  });

  it('人员被归档后统计仍能找到他（显示原名）', () => {
    const { entries } = generateSchedule({ persons: FOUR, config: config() });
    const archived = FOUR.map((p) => (p.id === 'p1' ? { ...p, archivedAt: '2026-05-01T00:00:00.000Z' } : p));
    const stats = collectStats({ entries }, archived);
    expect(stats.perPerson.find((item) => item.personId === 'p1')?.name).toBe('张三');
  });
});
