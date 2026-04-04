import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonthName(month: number): string {
  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  return months[month];
}

export function getWeekDayName(day: number): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[day];
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 农历日期转换函数 - 基于参考链接的算法
const lunarMonthNames = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const lunarDayNames = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

// 农历数据 - 1900年到2100年 (来自香港天文台数据)
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, //1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, //1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, //1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, //1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, //1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, //1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, //1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, //1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, //1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, //1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, //2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, //2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, //2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, //2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, //2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0, //2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, //2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, //2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, //2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, //2090-2099
  0x0d520                                                                                   //2100
];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function calcSolarDateInterval(date1: Date, date2: Date): number {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  let totalDays1 = 0;
  let totalDays2 = 0;
  
  monthDays[1] = isLeapYear(date1.getFullYear()) ? 29 : 28;
  for (let i = 1; i < date1.getMonth() + 1; i++) {
    totalDays1 += monthDays[i - 1];
  }
  totalDays1 += date1.getDate();
  
  monthDays[1] = isLeapYear(date2.getFullYear()) ? 29 : 28;
  for (let i = 1; i < date2.getMonth() + 1; i++) {
    totalDays2 += monthDays[i - 1];
  }
  totalDays2 += date2.getDate();
  
  let totalDays = 0;
  
  if (date1.getFullYear() === date2.getFullYear()) {
    totalDays = totalDays2 - totalDays1;
  } else {
    for (let i = date1.getFullYear() + 1; i < date2.getFullYear(); i++) {
      totalDays += isLeapYear(i) ? 366 : 365;
    }
    totalDays += (isLeapYear(date1.getFullYear()) ? 366 : 365) - totalDays1 + totalDays2;
  }
  
  return totalDays;
}

function getLunarYearInfo(year: number): { hasLeapMonth: boolean; leapWhichMonth: number; leapMonthIs30Days: boolean } {
  if (year < 1900 || year > 2100) {
    return { hasLeapMonth: false, leapWhichMonth: 0, leapMonthIs30Days: false };
  }
  
  const info = LUNAR_INFO[year - 1900];
  const leapMonth = info & 0x0000000f;
  
  if (leapMonth === 0 || leapMonth > 12) {
    return { hasLeapMonth: false, leapWhichMonth: 0, leapMonthIs30Days: false };
  }
  
  return { 
    hasLeapMonth: true, 
    leapWhichMonth: leapMonth, 
    leapMonthIs30Days: ((info >> 16) & 0x00000001) === 1 
  };
}

function getLunarMonthDays(year: number, lunarMonth: number): number {
  if (year < 1900 || year > 2100) return 29;
  if (lunarMonth < 1 || lunarMonth > 12) return 29;
  
  const info = LUNAR_INFO[year - 1900];
  // bit15 对应农历1月，bit4 对应农历12月
  const bitPosition = (12 - lunarMonth) + 4;
  return ((info >> bitPosition) & 0x00000001) ? 30 : 29;
}

export function getLunarDate(date: Date): string {
  const solar1900 = new Date(1900, 0, 31); // 1900/1/31为正月初一
  
  const interval = calcSolarDateInterval(solar1900, date) + 1;
  
  let solarYear = 1900;
  let lunarMonth = 1;
  let lunarDay = 1;
  let isLeapMonth = false;
  let accumulatedDays = 0;
  
  while (true) {
    const yearInfo = getLunarYearInfo(solarYear);
    
    // 处理闰月
    if (isLeapMonth) {
      accumulatedDays += yearInfo.leapMonthIs30Days ? 30 : 29;
    } else {
      accumulatedDays += getLunarMonthDays(solarYear, lunarMonth);
    }
    
    if (accumulatedDays >= interval) {
      if (isLeapMonth) {
        lunarDay = (yearInfo.leapMonthIs30Days ? 30 : 29) - (accumulatedDays - interval);
      } else {
        lunarDay = getLunarMonthDays(solarYear, lunarMonth) - (accumulatedDays - interval);
      }
      break;
    }
    
    // 处理闰月逻辑
    if (yearInfo.hasLeapMonth && !isLeapMonth) {
      if (yearInfo.leapWhichMonth === lunarMonth) {
        isLeapMonth = true;
      } else {
        lunarMonth++;
      }
    } else if ((yearInfo.hasLeapMonth && isLeapMonth) || !yearInfo.hasLeapMonth) {
      isLeapMonth = false;
      lunarMonth++;
    }
    
    if (lunarMonth > 12) {
      solarYear++;
      lunarMonth = 1;
      if (solarYear > 2100) break;
    }
  }
  
  return `${lunarMonthNames[lunarMonth]}${lunarDayNames[lunarDay]}`;
}
