import { describe, expect, it } from 'vitest';
import { parsePersonLines, selectImportable } from './personImport';

describe('personImport：解析', () => {
  it('每行一个姓名', () => {
    const { rows, skipped } = parsePersonLines('张三\n李四\n王五');
    expect(rows.map((r) => r.name)).toEqual(['张三', '李四', '王五']);
    expect(skipped).toBe(0);
  });

  it('忽略空行、前后空格与注释行', () => {
    const text = '\n  张三  \n\n# 这是注释\n// 也是注释\n李四\n   \n';
    const { rows } = parsePersonLines(text);
    expect(rows.map((r) => r.name)).toEqual(['张三', '李四']);
    expect(rows[0].line).toBe(2);
  });

  it('支持逗号/中文逗号/制表符/多空格分隔（从 Excel 复制粘贴）', () => {
    const text = [
      '张三,技术部,13800000000,zhang@example.com',
      '李四，市场部，13900000000',
      '王五\t行政部\t13700000000\twang@example.com',
      '赵六  财务部  13600000000',
    ].join('\n');
    const { rows } = parsePersonLines(text);
    expect(rows.map((r) => [r.name, r.department, r.phone, r.email])).toEqual([
      ['张三', '技术部', '13800000000', 'zhang@example.com'],
      ['李四', '市场部', '13900000000', undefined],
      ['王五', '行政部', '13700000000', 'wang@example.com'],
      ['赵六', '财务部', '13600000000', undefined],
    ]);
  });

  it('只有姓名与邮箱两列时也能识别邮箱', () => {
    const { rows } = parsePersonLines('张三,zhang@example.com');
    expect(rows[0]).toMatchObject({ name: '张三', email: 'zhang@example.com', department: undefined });
  });

  it('多余的列被忽略，不会污染字段', () => {
    const { rows } = parsePersonLines('张三,技术部,13800000000,a@b.com,多余的一列,还有一列');
    expect(rows[0]).toMatchObject({ name: '张三', department: '技术部', phone: '13800000000', email: 'a@b.com' });
  });

  it('统一部门只在行内没写部门时生效', () => {
    const { rows } = parsePersonLines('张三\n李四,市场部', { defaultDepartment: '技术部' });
    expect(rows.map((r) => r.department)).toEqual(['技术部', '市场部']);
  });

  it('标记重名（与现有人员、以及本次导入内部重复）', () => {
    const { rows } = parsePersonLines('张三\n李四\n张三', { existingNames: ['李四'] });
    expect(rows[0].issues).toEqual([]);
    expect(rows[1].issues).toContain('与现有人员重名');
    expect(rows[2].issues).toContain('本次导入里重复');
  });

  it('姓名列缺失的行被跳过并计数', () => {
    const { rows, skipped } = parsePersonLines(',技术部\n张三');
    expect(rows.map((r) => r.name)).toEqual(['张三']);
    expect(skipped).toBe(1);
  });

  it('邮箱格式可疑会给出提示但不阻断（带 @ 就收下，避免悄悄丢字段）', () => {
    const bad = parsePersonLines('张三,技术部,a@b').rows[0];
    expect(bad).toMatchObject({ name: '张三', department: '技术部', email: 'a@b' });
    expect(bad.issues.join()).toContain('邮箱格式可疑');

    const slash = parsePersonLines('张三,技术部,abc@').rows[0];
    expect(slash.email).toBe('abc@');
    expect(slash.issues.join()).toContain('邮箱格式可疑');

    const good = parsePersonLines('张三,技术部,zhang@example.com').rows[0];
    expect(good.email).toBe('zhang@example.com');
    expect(good.issues).toEqual([]);
  });
});

describe('personImport：挑选可导入行', () => {
  it('勾选跳过重名时，剔除有问题与重复的行', () => {
    const { rows } = parsePersonLines('张三\n李四\n张三', { existingNames: ['李四'] });
    const picked = selectImportable(rows, true);
    expect(picked.map((r) => r.name)).toEqual(['张三']);
  });

  it('不跳过重名时全部保留', () => {
    const { rows } = parsePersonLines('张三\n张三');
    expect(selectImportable(rows, false)).toHaveLength(2);
  });
});
