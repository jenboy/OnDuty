'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileUp, Upload } from 'lucide-react';
import { parsePersonLines, selectImportable } from '@/domain/personImport';
import type { Person } from '@/domain/types';
import { useAppStore, usePersons } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Dialog';
import { Checkbox, Field, TextInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { PERSON_COLORS } from '@/components/people/PersonFormDialog';
import { cn } from '@/lib/cn';

const PLACEHOLDER = `每行一个人，例如：
张三
李四,市场部
王五,技术部,13800000000,wang@example.com

也支持从 Excel/WPS 直接复制多列粘进来（制表符或多空格分隔）；
以 # 开头的行会被当作注释忽略。`;

export function BatchImportDialog({ onClose }: { onClose: () => void }) {
  const persons = usePersons();
  const addPersons = useAppStore((s) => s.addPersons);
  const { push } = useToast();

  const [text, setText] = useState('');
  const [defaultDepartment, setDefaultDepartment] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () =>
      parsePersonLines(text, {
        existingNames: persons.map((p) => p.name),
        defaultDepartment: defaultDepartment.trim() || undefined,
      }),
    [text, persons, defaultDepartment]
  );

  const importable = useMemo(() => selectImportable(parsed.rows, skipDuplicates), [parsed.rows, skipDuplicates]);
  const flagged = parsed.rows.filter((row) => row.issues.length > 0);

  const submit = () => {
    if (importable.length === 0) {
      push('error', '没有可导入的人员');
      return;
    }
    const created = addPersons(
      importable.map((row, index) => ({
        name: row.name,
        department: row.department,
        phone: row.phone,
        email: row.email,
        color: PERSON_COLORS[(persons.length + index) % PERSON_COLORS.length],
      }))
    );
    push('success', `已导入 ${created.length} 人${flagged.length > 0 ? `（跳过 ${flagged.length} 行）` : ''}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="批量导入人员"
      description="粘贴名单即可，导入前会先预览"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" icon={<Upload className="h-4 w-4" />} onClick={submit} disabled={importable.length === 0}>
            导入 {importable.length} 人
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <Field label="统一部门" hint="行里没写部门时用这个，可留空">
              <TextInput
                value={defaultDepartment}
                placeholder="例如：技术部"
                onChange={(event) => setDefaultDepartment(event.target.value)}
              />
            </Field>
          </div>
          <Button icon={<FileUp className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
            选择文件
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const content = await file.text();
              setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${content}` : content));
              push('info', `已读取 ${file.name}`);
            }}
          />
        </div>

        <Field label="名单" required hint={`粘贴或输入，每行一个人（已解析 ${parsed.rows.length} 行）`}>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={PLACEHOLDER}
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </Field>

        <Checkbox
          label="跳过重名与重复行（与现有人员重名、或本次名单里重复的）"
          checked={skipDuplicates}
          onChange={setSkipDuplicates}
        />

        {parsed.rows.length > 0 && (
          <div className="rounded-lg border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm text-gray-600">
              <span>
                预览：将导入 <strong className="text-gray-900">{importable.length}</strong> 人
                {parsed.skipped > 0 && `，忽略 ${parsed.skipped} 行空白`}
                {flagged.length > 0 && `，${flagged.length} 行有问题`}
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">行</th>
                    <th className="px-3 py-1.5 font-medium">姓名</th>
                    <th className="px-3 py-1.5 font-medium">部门</th>
                    <th className="px-3 py-1.5 font-medium">电话</th>
                    <th className="px-3 py-1.5 font-medium">邮箱</th>
                    <th className="px-3 py-1.5 font-medium">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 200).map((row) => {
                    const willImport = importable.includes(row);
                    return (
                      <tr key={`${row.line}-${row.name}`} className={cn('border-t border-gray-100', !willImport && 'text-gray-400')}>
                        <td className="px-3 py-1.5">{row.line}</td>
                        <td className="px-3 py-1.5 font-medium">{row.name}</td>
                        <td className="px-3 py-1.5">{row.department ?? '—'}</td>
                        <td className="px-3 py-1.5">{row.phone ?? '—'}</td>
                        <td className="px-3 py-1.5">{row.email ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          {row.issues.length > 0 ? (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {row.issues.join('、')}
                              {willImport ? '（仍会导入）' : '（跳过）'}
                            </span>
                          ) : (
                            <span className="text-green-600">将导入</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsed.rows.length > 200 && <p className="px-3 py-2 text-xs text-gray-400">仅显示前 200 行</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export type { Person };
