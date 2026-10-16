/**
 * 农历与二十四节气：薄封装 lunar-typescript（零依赖，算法来自真实历法计算）。
 *
 * 为什么换掉原来的实现：旧的手写「寿星公式」把系数表顺序写错位，2026 年 24 个节气里
 * 12 个日期偏差 1~2 天（已用紫金山天文台《二〇二六年日历资料》逐条对照确认），
 * 而且 2001–2099 之外静默返回全 0。这里的第一条测试就是拿官方表做 24/24 对照。
 */
import { Solar } from 'lunar-typescript';
import { fromKey, type DateKey } from './date';

export interface DayLunar {
  /** 日历格子里的短文本：节气名 > 农历月初（“正月”） > 农历日（“十三”） */
  label: string;
  /** 完整农历描述，如「正月初一」 */
  full: string;
  /** 当天节气名；非节气日为 null */
  jieQi: string | null;
}

const cache = new Map<DateKey, DayLunar>();
const MAX_CACHE = 4000;

export function getDayLunar(key: DateKey): DayLunar {
  const hit = cache.get(key);
  if (hit) return hit;

  const date = fromKey(key);
  const lunar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar();
  const jieQi = lunar.getJieQi() || null;
  // lunar-typescript 的月名不含「月」字（正月 → '正'，冬月 → '冬'，闰月 → '闰四'），这里补回来
  const monthText = `${lunar.getMonthInChinese()}月`;
  const dayText = lunar.getDayInChinese();
  const full = `${monthText}${dayText}`;

  const value: DayLunar = {
    label: jieQi ?? (dayText === '初一' ? monthText : dayText),
    full,
    jieQi,
  };

  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, value);
  return value;
}

/** 一次性取整月的农历信息（视图层按月取用，避免逐格重复计算） */
export function getMonthLunar(year: number, month0: number): Map<DateKey, DayLunar> {
  const days = new Date(year, month0 + 1, 0).getDate();
  const out = new Map<DateKey, DayLunar>();
  for (let day = 1; day <= days; day++) {
    const key = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    out.set(key, getDayLunar(key));
  }
  return out;
}

/** 测试与调试用：清空缓存 */
export function clearLunarCache(): void {
  cache.clear();
}
