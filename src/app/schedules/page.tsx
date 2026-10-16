'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, CheckCircle2, Eye, LayoutList, Pencil, Trash2 } from 'lucide-react';
import type { Schedule } from '@/domain/types';
import { useAppStore, useSchedules } from '@/store/useAppStore';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDialog, Modal } from '@/components/ui/Dialog';
import { Field, TextInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { ScheduleWizard } from '@/components/schedules/ScheduleWizard';
import { cn } from '@/lib/cn';

const STRATEGY_LABEL = { sequential: '正序', reverse: '倒序', random: '随机' } as const;

export default function SchedulesPage() {
  const schedules = useSchedules();
  const activeScheduleId = useAppStore((s) => s.activeScheduleId);
  const setActiveSchedule = useAppStore((s) => s.setActiveSchedule);
  const renameSchedule = useAppStore((s) => s.renameSchedule);
  const deleteSchedule = useAppStore((s) => s.deleteSchedule);
  const { push } = useToast();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [renaming, setRenaming] = useState<Schedule | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Schedule | null>(null);

  const sorted = useMemo(
    () => [...schedules].sort((a, b) => b.config.startDate.localeCompare(a.config.startDate)),
    [schedules]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">排班表</h1>
          <p className="mt-1 text-sm text-gray-500">
            共 {schedules.length} 张。生成时会即时预览前 7 天与风险提示，确认后才写入。
          </p>
        </div>
        <Button variant="primary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setWizardOpen(true)}>
          生成排班表
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <LayoutList className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">还没有排班表，点上面的「生成排班表」开始。</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((schedule) => {
            const unassigned = schedule.entries.filter((e) => !e.personId).length;
            const isActive = schedule.id === activeScheduleId;
            return (
              <li
                key={schedule.id}
                className={cn(
                  'rounded-xl border bg-white p-4 shadow-sm transition-colors',
                  isActive ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold text-gray-900">{schedule.name}</h2>
                      {isActive && (
                        <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          <CheckCircle2 className="h-3 w-3" />
                          当前
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {schedule.config.startDate} ~ {schedule.config.endDate} · {schedule.entries.length} 天 ·{' '}
                      {schedule.personIds.length} 人 · {STRATEGY_LABEL[schedule.config.rotationStrategy]}
                      {schedule.config.dutyType === 'weekly' && ' · 每周一人'}
                      {schedule.config.skipWeekends && ' · 跳过周末'}
                    </p>
                    {unassigned > 0 && (
                      <p className="mt-1 text-xs text-amber-600">有 {unassigned} 天没有可用人员</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isActive && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveSchedule(schedule.id);
                          push('success', `「${schedule.name}」已设为当前排班表`);
                        }}
                      >
                        设为当前
                      </Button>
                    )}
                    <Link href={`/schedule?id=${encodeURIComponent(schedule.id)}`}>
                      <Button size="sm" variant="primary" icon={<Eye className="h-4 w-4" />}>
                        查看
                      </Button>
                    </Link>
                    <IconButton
                      label="重命名"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => {
                        setRenaming(schedule);
                        setRenameValue(schedule.name);
                      }}
                    />
                    <IconButton
                      label="删除"
                      icon={<Trash2 className="h-4 w-4" />}
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setPendingDelete(schedule)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {wizardOpen && <ScheduleWizard onClose={() => setWizardOpen(false)} />}

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="重命名排班表"
        size="sm"
        footer={
          <>
            <Button onClick={() => setRenaming(null)}>取消</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (renaming && renameValue.trim()) {
                  renameSchedule(renaming.id, renameValue.trim());
                  push('success', '已重命名');
                }
                setRenaming(null);
              }}
            >
              保存
            </Button>
          </>
        }
      >
        <Field label="名称" required>
          <TextInput value={renameValue} autoFocus onChange={(event) => setRenameValue(event.target.value)} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除这张排班表？"
        danger
        confirmLabel="删除"
        message={
          <>
            将删除「{pendingDelete?.name}」及其 {pendingDelete?.entries.length ?? 0} 天排班记录，不可恢复。
          </>
        }
        onConfirm={() => {
          if (pendingDelete) {
            deleteSchedule(pendingDelete.id);
            push('info', `已删除「${pendingDelete.name}」`);
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
