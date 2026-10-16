import { describe, expect, it } from 'vitest';
import {
  backupLegacyKey,
  buildMigration,
  normalizeAppData,
  normalizePerson,
  normalizeSchedule,
  parseBackupFile,
  readLegacyFromLocalStorage,
  LEGACY_STORAGE_KEY,
} from './migrate';

/** 旧版本（认证期）真实存储形态：onduty-data = { users, dataByUser } */
const LEGACY_PAYLOAD = {
  users: [],
  dataByUser: {
    default: {
      persons: [
        {
          id: 'p1',
          name: '张三',
          department: '技术部',
          phone: '13800000000',
          email: 'z@example.com',
          color: '#ef4444',
          isActive: true,
          order: 0,
          excludedDays: [0, 3],
        },
        { id: 'p2', name: '李四', isActive: false, order: 1 },
        { id: 'bad' }, // 没名字，应被丢弃
      ],
      schedules: [
        {
          id: 's1',
          name: '2026年4月值日表',
          createdAt: '2026-03-31T10:00:00.000Z',
          updatedAt: '2026-03-31T10:00:00.000Z',
          config: {
            startDate: '2026-04-01',
            endDate: '2026-04-30',
            rotationStrategy: 'random',
            dutyType: 'daily',
            skipWeekends: true,
            skipHolidays: false,
          },
          entries: [
            { date: '2026-04-01', personId: 'p1', personName: '张三', isWeekend: false },
            { date: '2026-04-02', personId: 'none', personName: '无可用人员', isWeekend: false },
            { date: 'bad-date', personId: 'p1', personName: '张三', isWeekend: false },
          ],
          personIds: ['p1', 'p2'],
        },
        { id: 's2', name: '坏表', config: { startDate: '不是日期', endDate: '2026-04-30' }, entries: [] },
      ],
      currentSchedule: { id: 's1' },
      versionHistory: [{ id: 'v1', scheduleId: 's1', action: 'create', data: {} }],
    },
  },
};

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  };
}

describe('migrate：旧 localStorage → v1', () => {
  it('认得 dataByUser.default 里的数据', () => {
    const migration = buildMigration(LEGACY_PAYLOAD);
    expect(migration).not.toBeNull();
    const { data, summary } = migration!;

    expect(data.persons.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(data.persons[0].excludedDays).toEqual([0, 3]);
    expect(data.persons[0].archivedAt).toBeNull();
    expect(data.persons[1].isActive).toBe(false);
    expect(data.persons[1].excludedDays).toEqual([]);

    expect(data.schedules).toHaveLength(1); // 坏表被丢弃
    expect(summary.droppedSchedules).toBe(1);
    expect(data.activeScheduleId).toBe('s1');

    const schedule = data.schedules[0];
    expect(schedule.entries).toHaveLength(2); // 非法日期被丢弃
    expect(summary.entries).toBe(2);
    expect(schedule.entries[0]).toEqual({ date: '2026-04-01', personId: 'p1', isWeekend: false });
    // 'none' 哨兵值转换成 null（旧代码用一个假人表示「无人可用」）
    expect(schedule.entries[1].personId).toBeNull();
    // 不再冗余保存姓名
    expect('personName' in schedule.entries[0]).toBe(false);
    expect(schedule.lastPersonId).toBe('p1');
  });

  it('也兼容更早的平铺结构', () => {
    const flat = { persons: [{ id: 'a', name: '甲', isActive: true, order: 0 }], schedules: [], currentSchedule: null };
    const migration = buildMigration(flat);
    expect(migration?.data.persons).toHaveLength(1);
    expect(migration?.data.activeScheduleId).toBeNull();
  });

  it('无法识别的内容返回 null，而不是产生一份空数据覆盖用户数据', () => {
    expect(buildMigration({ hello: 'world' })).toBeNull();
    expect(buildMigration(null)).toBeNull();
    expect(buildMigration('字符串')).toBeNull();
  });

  it('迁移后把旧键改名备份，内容一字不改', () => {
    const storage = fakeStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(LEGACY_PAYLOAD) });
    const legacy = readLegacyFromLocalStorage(storage);
    expect(legacy).not.toBeNull();

    const migration = buildMigration(legacy!.payload)!;
    backupLegacyKey(migration.backupKey, storage);

    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(migration.backupKey)!)).toEqual(LEGACY_PAYLOAD);
  });

  it('JSON 坏掉的旧数据不会抛异常', () => {
    expect(readLegacyFromLocalStorage(fakeStorage({ [LEGACY_STORAGE_KEY]: '{不是 json' }))).toBeNull();
  });
});

describe('migrate：规范化容错', () => {
  it('人员缺 id/字段时补齐，没名字的丢弃', () => {
    expect(normalizePerson({ name: '甲' }, 3)).toMatchObject({
      name: '甲',
      isActive: true,
      order: 3,
      excludedDays: [],
      archivedAt: null,
    });
    expect(normalizePerson({ name: '甲', excludedDays: [9, -1, 2, 2, '3'] }, 0)?.excludedDays).toEqual([2, 3]);
    expect(normalizePerson({}, 0)).toBeNull();
    expect(normalizePerson(null, 0)).toBeNull();
  });

  it('排班表日期非法就整表丢弃', () => {
    expect(normalizeSchedule({ config: { startDate: '2026-04-01', endDate: '2026-30-01' } }, 0)).toBeNull();
  });

  it('duplicate 人员 id 去重', () => {
    const data = normalizeAppData({
      persons: [
        { id: 'x', name: '甲' },
        { id: 'x', name: '乙' },
      ],
      schedules: [],
    });
    expect(data.persons).toHaveLength(1);
    expect(data.persons[0].name).toBe('甲');
  });

  it('activeScheduleId 指向不存在的表时回落到第一张表', () => {
    const data = normalizeAppData({
      persons: [],
      schedules: [
        {
          id: 's1',
          name: 'A',
          config: { startDate: '2026-04-01', endDate: '2026-04-30' },
          entries: [],
        },
      ],
      activeScheduleId: '不存在',
    });
    expect(data.activeScheduleId).toBe('s1');
  });
});

describe('migrate：JSON 备份导入', () => {
  const goodFile = JSON.stringify({
    app: 'onduty',
    schema: 1,
    exportedAt: '2026-10-16T00:00:00.000Z',
    data: {
      persons: [{ id: 'p1', name: '张三', isActive: true, order: 0, excludedDays: [] }],
      schedules: [],
      activeScheduleId: null,
    },
  });

  it('接受合法备份并做规范化', () => {
    const parsed = parseBackupFile(goodFile);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.file.data.persons).toHaveLength(1);
      expect(parsed.file.schema).toBe(1);
    }
  });

  it('拒绝非法 JSON / 未来版本 / 空备份', () => {
    expect(parseBackupFile('不是 json').ok).toBe(false);
    const future = JSON.stringify({ schema: 99, data: { persons: [{ name: '甲' }], schedules: [] } });
    expect(parseBackupFile(future)).toMatchObject({ ok: false });
    expect(parseBackupFile(JSON.stringify({ schema: 1, data: { persons: [], schedules: [] } })).ok).toBe(false);
  });
});
