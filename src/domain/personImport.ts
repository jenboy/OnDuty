/**
 * 批量导入人员的文本解析（纯函数，便于单测）。
 *
 * 支持的每行格式（分隔符可以是英文逗号、中文逗号、制表符或两个以上空格，
 * 也就是从 Excel/WPS 直接复制一列或多列粘进来都能用）：
 *   姓名
 *   姓名,部门
 *   姓名,部门,电话
 *   姓名,部门,电话,邮箱
 *   姓名  部门  13800000000  a@b.com      ← 空格分隔
 * 以 # 或 // 开头的行按注释忽略；空行忽略。
 */
export interface ParsedPersonRow {
  /** 源文本行号（从 1 开始），便于用户对照 */
  line: number;
  name: string;
  department?: string;
  phone?: string;
  email?: string;
  /** 需要用户注意的问题（不会阻断导入，除非 name 为空） */
  issues: string[];
}

export interface ParsePersonOptions {
  /** 已有人员姓名，用于重名提示（忽略首尾空格） */
  existingNames?: readonly string[];
  /** 统一部门：行内没写部门时使用 */
  defaultDepartment?: string;
}

export interface ParsePersonResult {
  rows: ParsedPersonRow[];
  /** 被跳过的行数（空行/注释不算） */
  skipped: number;
}

const SEPARATOR = /[,，\t]|\s{2,}/;
const COMMENT = /^\s*(#|\/\/)/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitColumns(line: string): string[] {
  // 注意：这里**不能**过滤空串 —— 首列决定姓名，',技术部' 这种行必须能被识别为「缺姓名」而不是把部门当姓名
  return line.split(SEPARATOR).map((part) => part.trim());
}

export function parsePersonLines(text: string, options: ParsePersonOptions = {}): ParsePersonResult {
  const rows: ParsedPersonRow[] = [];
  let skipped = 0;

  const existing = new Set((options.existingNames ?? []).map((name) => name.trim()));
  const seenInFile = new Set<string>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || COMMENT.test(line)) return;

    const columns = splitColumns(line);
    const name = columns[0] ?? '';
    if (!name) {
      skipped += 1;
      return;
    }

    const rest = columns.slice(1).filter((part) => part.length > 0);
    let department: string | undefined;
    let phone: string | undefined;
    let email: string | undefined;

    for (const value of rest) {
      // 只要带 @ 就按邮箱收下（哪怕格式不标准），这样预览里能看见、并给出提示，而不是悄悄丢掉
      if (!email && value.includes('@')) {
        email = value;
      } else if (!phone && /^[\d+()-][\d\s+()-]{4,}$/.test(value)) {
        phone = value;
      } else if (!department) {
        department = value;
      }
      // 多余的列直接忽略（比如从 Excel 里多带了一列）
    }

    const issues: string[] = [];
    if (existing.has(name)) issues.push('与现有人员重名');
    if (seenInFile.has(name)) issues.push('本次导入里重复');
    seenInFile.add(name);
    if (email && !EMAIL.test(email)) issues.push('邮箱格式可疑');

    rows.push({
      line: index + 1,
      name,
      department: department ?? options.defaultDepartment,
      phone,
      email,
      issues,
    });
  });

  return { rows, skipped };
}

/** 按「跳过重名」策略挑出真正要导入的行 */
export function selectImportable(rows: readonly ParsedPersonRow[], skipDuplicates: boolean): ParsedPersonRow[] {
  if (!skipDuplicates) return [...rows];
  const taken = new Set<string>();
  const result: ParsedPersonRow[] = [];
  for (const row of rows) {
    if (row.issues.length > 0) continue;
    if (taken.has(row.name)) continue;
    taken.add(row.name);
    result.push(row);
  }
  return result;
}
