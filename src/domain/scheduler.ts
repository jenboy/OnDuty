/**
 * 排班引擎（纯函数，无 React、无 IO —— 可直接单测）
 *
 * 相对旧实现修掉的问题：
 * - 轮换策略真正生效：旧代码每天「取值班次数最少的人」，`reverse`/`random` 只影响平局顺序；
 * - random 可复现：种子写进 config.seed，同样输入必然得到同样结果；
 * - 可跨表接续：传 previousPersonId 即避免上一张表最后一天的人排在本表第一天；
 * - 无人可用用 personId: null 明确表达（旧代码塞了一个 id='none' 的假人进数据）；
 * - 返回 warnings，把「某天没人可排」这类事实说出来，而不是静默产出。
 */
import type { Person, ScheduleConfig, ScheduleEntry, Weekday } from './types';
import { eachDay, isWeekendKey, weekdayOf } from './date';
import { createRng, seedFromString, shuffleWithRng } from './rng';

export interface GenerateInput {
  /** 人员名册（内部会过滤掉停用与已归档的人） */
  persons: readonly Person[];
  config: ScheduleConfig;
  /** 跨表接续：上一张排班表最后一天的值班人 */
  previousPersonId?: string | null;
}

export interface GenerateResult {
  entries: ScheduleEntry[];
  warnings: string[];
  /** 本表最后一天的值班人，可传给下一张表做接续 */
  lastPersonId: string | null;
  /** 实际使用的随机种子（写回 config.seed 以便复现） */
  seed: number;
}

const MSG_NO_PERSON = '没有任何启用状态的人员，未生成排班';

export function generateSchedule(input: GenerateInput): GenerateResult {
  const { config } = input;
  const warnings: string[] = [];

  const candidates = input.persons
    .filter((p) => p.isActive && !p.archivedAt)
    .slice()
    .sort((a, b) => a.order - b.order);

  const seed = config.seed ?? seedFromString(`${config.startDate}|${config.endDate}|${config.rotationStrategy}`);

  if (candidates.length === 0) {
    return { entries: [], warnings: [MSG_NO_PERSON], lastPersonId: null, seed };
  }

  const rotation = orderPersons(candidates, config.rotationStrategy, seed);
  const dutyCount = new Map<string, number>(rotation.map((p) => [p.id, 0]));

  const days = eachDay(config.startDate, config.endDate);
  const entries: ScheduleEntry[] = [];
  let lastPersonId: string | null = input.previousPersonId ?? null;
  let unassigned = 0;
  let forcedConsecutive = 0;

  const blockSize = config.dutyType === 'weekly' ? 7 : 1;

  for (let i = 0; i < days.length; i += blockSize) {
    const block = days.slice(i, i + blockSize);
    const servingDays = block.filter((day) => !(config.skipWeekends && isWeekendKey(day)));
    if (servingDays.length === 0) continue;

    // 以块的第一个实际值班日为判断依据（周模式下即该周第一个工作日）
    const anchorWeekday: Weekday = weekdayOf(servingDays[0]);
    const picked = pickPerson(rotation, anchorWeekday, lastPersonId, dutyCount);

    if (picked.kind === 'none') {
      unassigned += servingDays.length;
      warnings.push(
        `${servingDays[0]} 起没有任何可排班的人员（当天值班的人都被设为不可排该星期）`
      );
      for (const day of servingDays) {
        entries.push({ date: day, personId: null, isWeekend: isWeekendKey(day) });
      }
      continue;
    }

    if (picked.kind === 'forced') forcedConsecutive += 1;

    dutyCount.set(picked.person.id, (dutyCount.get(picked.person.id) ?? 0) + 1);
    lastPersonId = picked.person.id;

    for (const day of servingDays) {
      entries.push({ date: day, personId: picked.person.id, isWeekend: isWeekendKey(day) });
    }
  }

  if (forcedConsecutive > 0) {
    warnings.push(`有 ${forcedConsecutive} 次无法避开连续值班（当天只有一个人可排）`);
  }
  if (unassigned > 0) {
    warnings.push(`共 ${unassigned} 天没有任何可用人员`);
  }
  if (config.skipWeekends && entries.length === 0) {
    warnings.push('所选区间内没有可排班的工作日');
  }
  if (config.dutyType === 'weekly' && candidates.length > 1) {
    warnings.push('周模式按「每 7 天一人」轮换，区间首尾可能出现不足 7 天的块');
  }

  return { entries, warnings, lastPersonId, seed };
}

function orderPersons(persons: Person[], strategy: ScheduleConfig['rotationStrategy'], seed: number): Person[] {
  switch (strategy) {
    case 'reverse':
      return [...persons].reverse();
    case 'random':
      return shuffleWithRng(persons, createRng(seed));
    case 'sequential':
    default:
      return [...persons];
  }
}

type PickResult =
  | { kind: 'ok'; person: Person }
  | { kind: 'forced'; person: Person }
  | { kind: 'none' };

/**
 * 选人：优先「不违反 excludedDays 且不是上一位值班人」的人里值班次数最少的；
 * 若因此没人可选，则放宽「不连续」这一条；再不行就判定当天无人可用。
 */
function pickPerson(
  rotation: readonly Person[],
  weekday: Weekday,
  lastPersonId: string | null,
  dutyCount: ReadonlyMap<string, number>
): PickResult {
  const notExcluded = rotation.filter((p) => !p.excludedDays.includes(weekday));
  if (notExcluded.length === 0) return { kind: 'none' };

  const fresh = notExcluded.filter((p) => p.id !== lastPersonId);
  if (fresh.length > 0) return { kind: 'ok', person: leastDuty(fresh, dutyCount) };
  return { kind: 'forced', person: leastDuty(notExcluded, dutyCount) };
}

/** 值班次数最少者优先；次数相同则按轮换顺序（rotation 的先后）取靠前的 */
function leastDuty(persons: readonly Person[], dutyCount: ReadonlyMap<string, number>): Person {
  let best = persons[0];
  let bestCount = dutyCount.get(best.id) ?? 0;
  for (const person of persons.slice(1)) {
    const count = dutyCount.get(person.id) ?? 0;
    if (count < bestCount) {
      best = person;
      bestCount = count;
    }
  }
  return best;
}
