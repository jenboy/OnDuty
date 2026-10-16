/**
 * 领域模型（v1）
 *
 * 与旧模型（src/types）的关键差异：
 * 1. ScheduleEntry 不再冗余存 personName —— 姓名/配色实时取自人员名册，改名立即全表一致；
 * 2. Person 只做「归档」（archivedAt）不做物理删除 —— 历史排班永远能找到人；
 * 3. 用 activeScheduleId 取代存整份 currentSchedule —— 消除「两份真相」；
 * 4. 不再有 versionHistory（旧实现存 5 份快照但没有 UI 入口，纯占空间）。
 */

/** 星期几：0=周日 … 6=周六（与 Date.getDay() 一致） */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Person {
  id: string;
  name: string;
  department?: string;
  phone?: string;
  email?: string;
  color?: string;
  isActive: boolean;
  /** 名册内的展示/轮换顺序 */
  order: number;
  /** 不可排班的星期几；缺省表示不限制 */
  excludedDays: Weekday[];
  /** 归档时间（ISO）；null 表示在册。归档的人不参与新排班，但历史排班照常显示 */
  archivedAt: string | null;
}

export type RotationStrategy = 'sequential' | 'reverse' | 'random';

/** daily=每天一人；weekly=每 7 天一人（从 startDate 起算的连续 7 天块） */
export type DutyType = 'daily' | 'weekly';

export interface ScheduleConfig {
  /** 'YYYY-MM-DD'（本地日历日，不含时区语义） */
  startDate: string;
  endDate: string;
  rotationStrategy: RotationStrategy;
  dutyType: DutyType;
  skipWeekends: boolean;
  /** random 策略的随机种子；固定种子 ⇒ 同样输入必然得到同样排班 */
  seed?: number;
}

export interface ScheduleEntry {
  /** 'YYYY-MM-DD' */
  date: string;
  /** null = 当天没有任何可用人员 */
  personId: string | null;
  isWeekend: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: ScheduleConfig;
  entries: ScheduleEntry[];
  /** 生成时的参与人员（人员被归档后仍然保留，仅用于回溯） */
  personIds: string[];
  /** 最后一天值班的人，供下一张排班表「接着排」 */
  lastPersonId: string | null;
}

/** 持久化的完整应用数据 */
export interface AppData {
  persons: Person[];
  schedules: Schedule[];
  activeScheduleId: string | null;
}

/** JSON 备份文件的结构 */
export interface BackupFile {
  app: 'onduty';
  schema: number;
  exportedAt: string;
  data: AppData;
}

export const SCHEMA_VERSION = 1;
