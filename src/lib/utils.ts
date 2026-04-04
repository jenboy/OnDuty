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

// 农历日期转换函数
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x196d5, 0x092e0,
  0x1c8d7, 0x0c950, 0x0d4a0, 0x1d6aa, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2,
  0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8,
  0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950
];

const solarTerm = [
  0x9519, 0x4ab5, 0x4a55, 0x6a9a, 0x4955, 0x4daa, 0x95b5, 0x296d, 0x495f, 0x2b64, 0x952b, 0x4b61,
  0x4ba9, 0x95b5, 0x2a55, 0x6a9a, 0x2955, 0x4daa, 0x95b4, 0x296d, 0x495e, 0x6b63, 0x2a57, 0x925b
];

const lunarMonthNames = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const lunarDayNames = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

export function getLunarDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  let springYear = year;
  let springMonth = 3;
  let springDay = 21;
  
  if (month < springMonth || (month === springMonth && day < springDay)) {
    springYear--;
  }
  
  let index = springYear - 1900;
  let lunarYear = lunarInfo[index];
  let isLeap = (lunarYear & 0xf0000) !== 0;
  let leapMonth = (lunarYear & 0xf0000) >> 16;
  
  let days = 0;
  for (let i = 0; i < month - 1; i++) {
    days += getDaysInMonth(year, i);
  }
  days += day - 1;
  
  let lunarMonth = 1;
  let lunarDay = 1;
  
  for (let i = 0; i < 13; i++) {
    let m = i + 1;
    if (isLeap && m === leapMonth + 1) {
      m = leapMonth;
    }
    let daysInMonth = (lunarYear & 0x10000) !== 0 ? 30 : 29;
    lunarYear <<= 1;
    
    if (days < daysInMonth) {
      lunarDay = days + 1;
      break;
    }
    days -= daysInMonth;
    lunarMonth++;
    if (isLeap && m === leapMonth) {
      i--;
    }
  }
  
  return `${lunarMonthNames[lunarMonth]}${lunarDayNames[lunarDay]}`;
}
