'use client';

import { useState, type RefObject } from 'react';
import { FileImage, FileSpreadsheet, FileType, Loader2 } from 'lucide-react';
import type { Person, Schedule } from '@/domain/types';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, RadioGroup, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from '@/export/shared';
import { cn } from '@/lib/cn';

type Format = 'excel' | 'word' | 'image';

const FORMATS: Array<{ value: Format; label: string; icon: typeof FileSpreadsheet; hint: string }> = [
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, hint: '按月份分工作表，带底色与边框' },
  { value: 'word', label: 'Word', icon: FileType, hint: '日历排版，可直接打印' },
  { value: 'image', label: '图片', icon: FileImage, hint: '导出当前显示的月份为 PNG' },
];

const HEADER_COLORS = [
  { value: '3498DB', label: '蓝色' },
  { value: '27AE60', label: '绿色' },
  { value: '8E44AD', label: '紫色' },
  { value: '34495E', label: '深灰' },
];

export function ExportDialog({
  open,
  onClose,
  schedule,
  personLookup,
  calendarRef,
  currentMonth,
}: {
  open: boolean;
  onClose: () => void;
  schedule: Schedule;
  personLookup: Record<string, Person>;
  calendarRef: RefObject<HTMLDivElement | null>;
  currentMonth: { year: number; month0: number };
}) {
  const [format, setFormat] = useState<Format>('excel');
  const [options, setOptions] = useState<ExportOptions>({ ...DEFAULT_EXPORT_OPTIONS });
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  const run = async () => {
    setBusy(true);
    try {
      // 导出库都很大（write-excel-file / html-to-image），点的时候才加载
      if (format === 'excel') {
        const { exportScheduleToExcel } = await import('@/export/excel');
        await exportScheduleToExcel(schedule, personLookup, options);
      } else if (format === 'word') {
        const { exportScheduleToWord } = await import('@/export/word');
        await exportScheduleToWord(schedule, personLookup, options);
      } else {
        const node = calendarRef.current;
        if (!node) throw new Error('日历还没准备好，请稍后再试');
        const { exportNodeToPng } = await import('@/export/image');
        await exportNodeToPng(node, `${schedule.name}-${currentMonth.year}年${currentMonth.month0 + 1}月`);
      }
      push('success', `已导出「${schedule.name}」`);
      onClose();
    } catch (error) {
      push('error', `导出失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="导出排班表"
      description={schedule.name}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={run} disabled={busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
            {busy ? '导出中…' : '开始导出'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">导出格式</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {FORMATS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={format === item.value}
                  onClick={() => setFormat(item.value)}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left transition-colors',
                    format === item.value ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className={cn('h-5 w-5', format === item.value ? 'text-blue-600' : 'text-gray-400')} />
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {format !== 'image' && (
          <Field label="导出范围">
            <RadioGroup
              columns={2}
              value={options.scope}
              onChange={(scope) => setOptions({ ...options, scope })}
              options={[
                { value: 'all', label: '全部月份', description: `整张表共 ${schedule.entries.length} 天` },
                {
                  value: 'current',
                  label: '仅当前月',
                  description: `${currentMonth.year}年${currentMonth.month0 + 1}月`,
                },
              ]}
            />
          </Field>
        )}

        {format !== 'image' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox
              label="包含标题与周期"
              checked={options.includeHeader}
              onChange={(includeHeader) => setOptions({ ...options, includeHeader })}
            />
            <Checkbox
              label="页脚附一句寄语"
              checked={options.includeQuote}
              onChange={(includeQuote) => setOptions({ ...options, includeQuote })}
            />
          </div>
        )}

        {format !== 'image' && (
          <Field label="表头颜色" hint="仅影响表头底色">
            <Select
              value={options.headerColor}
              onChange={(event) => setOptions({ ...options, headerColor: event.target.value })}
            >
              {HEADER_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {format === 'image' && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            图片导出的是页面上当前显示的那个月，会包含农历与节气。
          </p>
        )}
      </div>
    </Modal>
  );
}
