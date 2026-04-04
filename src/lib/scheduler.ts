import {
  Person,
  ScheduleConfig,
  ScheduleEntry,
  Holiday,
  RotationStrategy,
} from '@/types';
import { formatDate, isWeekend, generateId, shuffleArray } from './utils';

export class SchedulerEngine {
  private persons: Person[];
  private holidays: Holiday[];
  private config: ScheduleConfig;

  constructor(
    persons: Person[],
    holidays: Holiday[],
    config: ScheduleConfig
  ) {
    this.persons = persons.filter(p => p.isActive).sort((a, b) => a.order - b.order);
    this.holidays = holidays;
    this.config = config;
  }

  generateSchedule(): ScheduleEntry[] {
    const entries: ScheduleEntry[] = [];
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(this.config.endDate);
    
    let currentDate = new Date(startDate);
    let personIndex = 0;
    
    const activePersons = [...this.persons];
    if (activePersons.length === 0) return entries;

    // 根据策略初始化人员顺序
    let orderedPersons = this.getOrderedPersons(activePersons, this.config.rotationStrategy);

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
      const isWeekendDay = isWeekend(currentDate);
      const holiday = this.getHoliday(currentDate);
      const isHoliday = !!holiday;

      // 判断是否跳过
      const shouldSkip = 
        (this.config.skipWeekends && isWeekendDay) ||
        (this.config.skipHolidays && isHoliday && !holiday?.isWorkday);

      if (!shouldSkip) {
        const person = orderedPersons[personIndex % orderedPersons.length];
        entries.push({
          date: dateStr,
          personId: person.id,
          personName: person.name,
          isHoliday,
          holidayName: holiday?.name,
          isWeekend: isWeekendDay,
        });
        personIndex++;
      }

      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return entries;
  }

  private getOrderedPersons(persons: Person[], strategy: RotationStrategy): Person[] {
    switch (strategy) {
      case 'reverse':
        return [...persons].reverse();
      case 'random':
        return shuffleArray(persons);
      case 'sequential':
      default:
        return persons;
    }
  }

  private getHoliday(date: Date): Holiday | undefined {
    const dateStr = formatDate(date);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return this.holidays.find(h => {
      if (h.type === 'once') {
        return h.date === dateStr;
      }
      if (h.type === 'yearly') {
        const hDate = new Date(h.date);
        return hDate.getMonth() + 1 === month && hDate.getDate() === day;
      }
      if (h.type === 'monthly') {
        const hDate = new Date(h.date);
        return hDate.getDate() === day;
      }
      return false;
    });
  }

  // 预测下月排班
  predictNextMonth(): ScheduleEntry[] {
    const lastDate = new Date(this.config.endDate);
    const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
    const nextMonthEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

    const nextConfig: ScheduleConfig = {
      ...this.config,
      startDate: formatDate(nextMonth),
      endDate: formatDate(nextMonthEnd),
    };

    const nextScheduler = new SchedulerEngine(this.persons, this.holidays, nextConfig);
    return nextScheduler.generateSchedule();
  }

  // 自动补班计算
  calculateMakeupDays(skippedDates: string[]): ScheduleEntry[] {
    const makeupEntries: ScheduleEntry[] = [];
    const endDate = new Date(this.config.endDate);
    
    let currentDate = new Date(endDate);
    currentDate.setDate(currentDate.getDate() + 1);

    const activePersons = this.persons.filter(p => p.isActive);
    if (activePersons.length === 0) return makeupEntries;

    let personIndex = 0;

    for (const skippedDate of skippedDates) {
      const isWeekendDay = isWeekend(currentDate);
      const holiday = this.getHoliday(currentDate);
      const isHoliday = !!holiday;

      const shouldSkip = 
        (this.config.skipWeekends && isWeekendDay) ||
        (this.config.skipHolidays && isHoliday && !holiday?.isWorkday);

      if (!shouldSkip) {
        const person = activePersons[personIndex % activePersons.length];
        makeupEntries.push({
          date: formatDate(currentDate),
          personId: person.id,
          personName: person.name,
          isHoliday,
          holidayName: holiday?.name,
          isWeekend: isWeekendDay,
        });
        personIndex++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return makeupEntries;
  }
}

// 排班验证器
export function validateSchedule(
  entries: ScheduleEntry[],
  persons: Person[],
  maxConsecutiveDays: number = 7
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const personConsecutiveDays: Map<string, number> = new Map();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const prevEntry = i > 0 ? entries[i - 1] : null;

    // 检查连续天数
    if (prevEntry && prevEntry.personId === entry.personId) {
      const current = personConsecutiveDays.get(entry.personId) || 1;
      personConsecutiveDays.set(entry.personId, current + 1);

      if (current + 1 > maxConsecutiveDays) {
        errors.push(`${entry.personName} 连续值班超过 ${maxConsecutiveDays} 天`);
      }
    } else {
      personConsecutiveDays.set(entry.personId, 1);
    }

    // 检查人员是否存在
    const person = persons.find(p => p.id === entry.personId);
    if (!person) {
      errors.push(`找不到人员: ${entry.personName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
