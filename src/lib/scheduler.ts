import {
  Person,
  ScheduleConfig,
  ScheduleEntry,
  RotationStrategy,
} from '@/types';
import { formatDate, isWeekend, generateId, shuffleArray } from './utils';

export class SchedulerEngine {
  private persons: Person[];
  private config: ScheduleConfig;

  constructor(
    persons: Person[],
    config: ScheduleConfig
  ) {
    this.persons = persons.filter(p => p.isActive).sort((a, b) => a.order - b.order);
    this.config = config;
  }

  generateSchedule(): ScheduleEntry[] {
    const entries: ScheduleEntry[] = [];
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(this.config.endDate);
    
    let currentDate = new Date(startDate);
    
    const activePersons = [...this.persons];
    if (activePersons.length === 0) return entries;

    // 根据策略初始化人员顺序
    let orderedPersons = this.getOrderedPersons(activePersons, this.config.rotationStrategy);
    
    // 跟踪每个人的值班次数
    const dutyCount = new Map<string, number>();
    activePersons.forEach(person => dutyCount.set(person.id, 0));

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
      const dayOfWeek = currentDate.getDay();
      const isWeekendDay = isWeekend(currentDate);

      // 判断是否跳过
      const shouldSkip = 
        (this.config.skipWeekends && isWeekendDay);

      if (!shouldSkip) {
        // 筛选出当天可用的人员
        // 1. 排除掉 excludedDays 包含当天星期几的人员
        // 2. 排除掉前一天值班的人员
        const lastEntry = entries[entries.length - 1];
        const lastPersonId = lastEntry?.personId;
        
        const availablePersons = orderedPersons.filter(
          p => 
            (!p.excludedDays || !p.excludedDays.includes(dayOfWeek)) &&
            p.id !== lastPersonId
        );

        if (availablePersons.length > 0) {
          // 按值班次数排序，选择值班次数最少的人员
          availablePersons.sort((a, b) => {
            const countA = dutyCount.get(a.id) || 0;
            const countB = dutyCount.get(b.id) || 0;
            return countA - countB;
          });
          
          const person = availablePersons[0];
          entries.push({
            date: dateStr,
            personId: person.id,
            personName: person.name,
            isWeekend: isWeekendDay,
          });
          
          // 更新值班次数
          dutyCount.set(person.id, (dutyCount.get(person.id) || 0) + 1);
        } else {
          // 如果当天没有可用人员，使用所有人员（即使是前一天值班的）
          const allAvailablePersons = orderedPersons.filter(
            p => !p.excludedDays || !p.excludedDays.includes(dayOfWeek)
          );
          
          if (allAvailablePersons.length > 0) {
            // 按值班次数排序，选择值班次数最少的人员
            allAvailablePersons.sort((a, b) => {
              const countA = dutyCount.get(a.id) || 0;
              const countB = dutyCount.get(b.id) || 0;
              return countA - countB;
            });
            
            const person = allAvailablePersons[0];
            entries.push({
              date: dateStr,
              personId: person.id,
              personName: person.name,
              isWeekend: isWeekendDay,
            });
            
            // 更新值班次数
            dutyCount.set(person.id, (dutyCount.get(person.id) || 0) + 1);
          } else {
            // 如果确实没有任何人员可用
            entries.push({
              date: dateStr,
              personId: 'none',
              personName: '无可用人员',
              isWeekend: isWeekendDay,
            });
          }
        }
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

    const nextScheduler = new SchedulerEngine(this.persons, nextConfig);
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

      const shouldSkip = 
        (this.config.skipWeekends && isWeekendDay);

      if (!shouldSkip) {
        const person = activePersons[personIndex % activePersons.length];
        makeupEntries.push({
          date: formatDate(currentDate),
          personId: person.id,
          personName: person.name,
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
