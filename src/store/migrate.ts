/**
 * 数据规范化与旧数据迁移。
 *
 * 两件事：
 * 1. normalizeAppData：把「任意来源的对象」整理成合法的 AppData —— 迁移旧 localStorage 与
 *    导入 JSON 备份共用这一份校验，任何字段缺失/类型不对都在这里被修正或丢弃；
 * 2. migrateLegacyLocalStorage：读旧的 `onduty-data`（localStorage）→ AppData，
 *    并把原键改名为 `onduty-data.backup.<时间戳>` 保留（绝不静默删除用户数据）。
 */
import { isDateKey } from '@/domain/date';
import { seedFromString } from '@/domain/rng';
import {
  SCHEMA_VERSION,
  type AppData,
  type BackupFile,
  type Person,
  type RotationStrategy,
  type Schedule,
  type ScheduleConfig,
  type ScheduleEntry,
  type Weekday,
} from '@/domain/types';

export const LEGACY_STORAGE_KEY = 'onduty-data';
export const LEGACY_BACKUP_PREFIX = 'onduty-data.backup.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeWeekdays(value: unknown): Weekday[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<Weekday>();
  for (const item of value) {
    const day = typeof item === 'number' ? item : Number(item);
    if (Number.isInteger(day) && day >= 0 && day <= 6) set.add(day as Weekday);
  }
  return [...set].sort((a, b) => a - b);
}

function normalizeStrategy(value: unknown): RotationStrategy {
  return value === 'reverse' || value === 'random' ? value : 'sequential';
}

export function normalizePerson(raw: unknown, index: number): Person | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name);
  if (!name) return null;
  const id = asString(raw.id) ?? `p-${index}-${seedFromString(name).toString(36)}`;
  return {
    id,
    name,
    department: asString(raw.department),
    phone: asString(raw.phone),
    email: asString(raw.email),
    color: asString(raw.color),
    isActive: raw.isActive === undefined ? true : Boolean(raw.isActive),
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index,
    excludedDays: normalizeWeekdays(raw.excludedDays),
    archivedAt: asString(raw.archivedAt) ?? null,
  };
}

function normalizeEntry(raw: unknown): ScheduleEntry | null {
  if (!isRecord(raw)) return null;
  const date = asString(raw.date);
  if (!date || !isDateKey(date)) return null;
  const personId = asString(raw.personId);
  return {
    date,
    personId: personId && personId !== 'none' ? personId : null,
    isWeekend: Boolean(raw.isWeekend),
  };
}

export function normalizeSchedule(raw: unknown, index: number): Schedule | null {
  if (!isRecord(raw)) return null;
  const configRaw = isRecord(raw.config) ? raw.config : {};
  const startDate = asString(configRaw.startDate);
  const endDate = asString(configRaw.endDate);
  if (!startDate || !isDateKey(startDate) || !endDate || !isDateKey(endDate)) return null;

  const entries = Array.isArray(raw.entries)
    ? raw.entries.map(normalizeEntry).filter((e): e is ScheduleEntry => e !== null)
    : [];
  entries.sort((a, b) => a.date.localeCompare(b.date));

  const personIds = Array.isArray(raw.personIds)
    ? raw.personIds.filter((id): id is string => typeof id === 'string')
    : [];

  const strategy = normalizeStrategy(configRaw.rotationStrategy);
  const config: ScheduleConfig = {
    startDate,
    endDate,
    rotationStrategy: strategy,
    dutyType: configRaw.dutyType === 'weekly' ? 'weekly' : 'daily',
    skipWeekends: Boolean(configRaw.skipWeekends),
    seed: Number.isFinite(Number(configRaw.seed)) ? Number(configRaw.seed) : undefined,
  };

  const lastEntry = [...entries].reverse().find((e) => e.personId);
  const name = asString(raw.name) ?? `${startDate} 值日表`;

  return {
    id: asString(raw.id) ?? `s-${index}-${seedFromString(name).toString(36)}`,
    name,
    createdAt: asString(raw.createdAt) ?? new Date().toISOString(),
    updatedAt: asString(raw.updatedAt) ?? asString(raw.createdAt) ?? new Date().toISOString(),
    config,
    entries,
    personIds,
    lastPersonId: asString(raw.lastPersonId) ?? lastEntry?.personId ?? null,
  };
}

/** 把任意对象整理成合法 AppData；无法识别的部分被丢弃而不是抛错 */
export function normalizeAppData(raw: unknown): AppData {
  const source = isRecord(raw) ? raw : {};
  const persons = Array.isArray(source.persons)
    ? source.persons.map(normalizePerson).filter((p): p is Person => p !== null)
    : [];
  // 去掉重复 id，保证后续按 id 查找是确定的
  const seen = new Set<string>();
  const uniquePersons = persons.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  const schedules = Array.isArray(source.schedules)
    ? source.schedules.map(normalizeSchedule).filter((s): s is Schedule => s !== null)
    : [];

  const wantedActive = asString(source.activeScheduleId);
  const activeScheduleId =
    wantedActive && schedules.some((s) => s.id === wantedActive) ? wantedActive : (schedules[0]?.id ?? null);

  return { persons: uniquePersons, schedules, activeScheduleId };
}

export interface LegacyMigrationResult {
  data: AppData;
  /** 供 UI 提示：迁移了多少东西、跳过了什么 */
  summary: { persons: number; schedules: number; entries: number; droppedSchedules: number };
  /** 旧键备份后的名字 */
  backupKey: string;
}

/** 旧数据结构里真正装数据的部分（认证版是 dataByUser['default']，更早是平铺的 AppState） */
function extractLegacyAppState(raw: unknown): unknown {
  if (!isRecord(raw)) return null;
  const dataByUser = raw.dataByUser;
  if (isRecord(dataByUser)) {
    const preferred = dataByUser.default;
    if (isRecord(preferred)) return preferred;
    const first = Object.values(dataByUser).find(isRecord);
    if (first) return first;
  }
  if (Array.isArray(raw.persons) || Array.isArray(raw.schedules)) return raw;
  return null;
}

/**
 * 读取并迁移旧的 localStorage 数据。
 * 迁移成功后会：写入新存储（由调用方完成）→ 把旧键改名备份 → 返回摘要。
 */
export function readLegacyFromLocalStorage(
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage
): { payload: unknown; raw: string } | null {
  if (!storage) return null;
  const raw = storage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;
  try {
    return { payload: JSON.parse(raw), raw };
  } catch {
    return null;
  }
}

export function buildMigration(
  legacyPayload: unknown,
  now: Date = new Date()
): LegacyMigrationResult | null {
  const state = extractLegacyAppState(legacyPayload);
  if (!state) return null;
  const data = normalizeAppData(state);
  const rawSchedules = isRecord(state) && Array.isArray(state.schedules) ? state.schedules.length : 0;
  return {
    data,
    summary: {
      persons: data.persons.length,
      schedules: data.schedules.length,
      entries: data.schedules.reduce((sum, s) => sum + s.entries.length, 0),
      droppedSchedules: Math.max(0, rawSchedules - data.schedules.length),
    },
    backupKey: `${LEGACY_BACKUP_PREFIX}${now.getTime()}`,
  };
}

/** 把旧 localStorage 键改名备份（保留内容，不删除） */
export function backupLegacyKey(
  backupKey: string,
  storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage
): void {
  if (!storage) return;
  const raw = storage.getItem(LEGACY_STORAGE_KEY);
  if (raw === null) return;
  try {
    storage.setItem(backupKey, raw);
    storage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // 备份失败时不删除原键，宁可下次再迁一次
  }
}

export function parseBackupFile(text: string): { ok: true; file: BackupFile } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: '不是合法的 JSON 文件' };
  }
  if (!isRecord(parsed)) return { ok: false, error: '备份内容不是对象' };
  const schema = Number(parsed.schema);
  if (!Number.isFinite(schema) || schema > SCHEMA_VERSION) {
    return { ok: false, error: `备份的数据版本（${String(parsed.schema)}）高于当前应用支持的版本（${SCHEMA_VERSION}）` };
  }
  const data = normalizeAppData(parsed.data ?? parsed);
  if (data.persons.length === 0 && data.schedules.length === 0) {
    return { ok: false, error: '备份里没有任何人员或排班表' };
  }
  return {
    ok: true,
    file: {
      app: 'onduty',
      schema,
      exportedAt: asString(parsed.exportedAt) ?? new Date().toISOString(),
      data,
    },
  };
}
