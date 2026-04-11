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
      const shouldSkip = this.shouldSkipDay(currentDate, isWeekendDay);

      if (!shouldSkip) {
        const lastEntry = entries[entries.length - 1];
        const lastPersonId = lastEntry?.personId;
        
        const person = this.selectPersonForDay(orderedPersons, dayOfWeek, lastPersonId, dutyCount);
        
        entries.push({
          date: dateStr,
          personId: person.id,
          personName: person.name,
          isWeekend: isWeekendDay,
        });
        
        // 更新值班次数
        if (person.id !== 'none') {
          dutyCount.set(person.id, (dutyCount.get(person.id) || 0) + 1);
        }
      }

      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return entries;
  }

  private shouldSkipDay(date: Date, isWeekendDay: boolean): boolean {
    return this.config.skipWeekends && isWeekendDay;
  }

  private selectPersonForDay(
    orderedPersons: Person[],
    dayOfWeek: number,
    lastPersonId: string | undefined,
    dutyCount: Map<string, number>
  ): { id: string; name: string } {
    // 筛选出当天可用的人员
    // 1. 排除掉 excludedDays 包含当天星期几的人员
    // 2. 排除掉前一天值班的人员
    const availablePersons = orderedPersons.filter(
      p => 
        (!p.excludedDays || !p.excludedDays.includes(dayOfWeek)) &&
        p.id !== lastPersonId
    );

    if (availablePersons.length > 0) {
      // 按值班次数排序，选择值班次数最少的人员
      return this.selectPersonWithLeastDuty(availablePersons, dutyCount);
    } else {
      // 如果当天没有可用人员，使用所有人员（即使是前一天值班的）
      const allAvailablePersons = orderedPersons.filter(
        p => !p.excludedDays || !p.excludedDays.includes(dayOfWeek)
      );
      
      if (allAvailablePersons.length > 0) {
        // 按值班次数排序，选择值班次数最少的人员
        return this.selectPersonWithLeastDuty(allAvailablePersons, dutyCount);
      } else {
        // 如果确实没有任何人员可用
        return { id: 'none', name: '无可用人员' };
      }
    }
  }

  private selectPersonWithLeastDuty(
    persons: Person[],
    dutyCount: Map<string, number>
  ): { id: string; name: string } {
    // 按值班次数排序，选择值班次数最少的人员
    persons.sort((a, b) => {
      const countA = dutyCount.get(a.id) || 0;
      const countB = dutyCount.get(b.id) || 0;
      return countA - countB;
    });
    
    return { id: persons[0].id, name: persons[0].name };
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
}

