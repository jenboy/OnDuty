/** 导出的公共部分：文件名、页脚名言（本地内置，不请求任何第三方接口） */
import { timestampForFilename } from '@/domain/date';
import { safeFilename } from '@/lib/download';
import { seedFromString } from '@/domain/rng';

export interface ExportOptions {
  /** 导出范围：全部月份，或只导当前显示的月份 */
  scope: 'all' | 'current';
  /** 当前显示的年月（scope='current' 时使用） */
  currentMonth?: { year: number; month0: number };
  includeHeader: boolean;
  /** 是否在页脚写上值班寄语 */
  includeQuote: boolean;
  /** 表头底色（十六进制，不带 #） */
  headerColor: string;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  scope: 'all',
  includeHeader: true,
  includeQuote: true,
  headerColor: '3498DB',
};

export function exportFilename(scheduleName: string, extension: string, now = new Date()): string {
  return `${safeFilename(scheduleName)}-${timestampForFilename(now)}.${extension}`;
}

const QUOTES: Array<{ content: string; from: string }> = [
  { content: '千万丈的大厦总要有片奠基石，最初的爱好无可替代。', from: '王小波《我的精神家园》' },
  { content: '凡事都要脚踏实地去作，不驰于空想，不骛于虚声。', from: '李大钊' },
  { content: '天下难事，必作于易；天下大事，必作于细。', from: '《道德经》' },
  { content: '不积跬步，无以至千里；不积小流，无以成江海。', from: '《荀子·劝学》' },
  { content: '把每一件简单的事做好就是不简单。', from: '谚语' },
  { content: '业精于勤，荒于嬉；行成于思，毁于随。', from: '韩愈《进学解》' },
];

/** 按排班表 id 稳定取一句（同一张表每次导出同一句） */
export function pickQuote(seedSource: string): { content: string; from: string } {
  return QUOTES[seedFromString(seedSource) % QUOTES.length];
}
