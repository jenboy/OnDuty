'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Download, ListChecks } from 'lucide-react';
import { collectMonthStats, collectStats } from '@/domain/stats';
import { fromKey } from '@/domain/date';
import { useAppStore, usePersonLookup } from '@/store/useAppStore';
import { CalendarGrid, CalendarLegend } from '@/components/calendar/CalendarGrid';
import { MonthNav } from '@/components/calendar/MonthNav';
import { useEntryMap } from '@/components/calendar/useEntryMap';
import { ExportDialog } from '@/components/export/ExportDialog';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

function ScheduleDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const schedules = useAppStore((s) => s.schedules);
  const activeScheduleId = useAppStore((s) => s.activeScheduleId);
  const setActiveSchedule = useAppStore((s) => s.setActiveSchedule);
  const personLookup = usePersonLookup();
  const { push } = useToast();

  const schedule = useMemo(() => schedules.find((item) => item.id === id) ?? null, [schedules, id]);
  const entries = useEntryMap(schedule);
  const persons = useMemo(() => Object.values(personLookup), [personLookup]);

  const [cursor, setCursor] = useState(() => {
    if (schedule) {
      const start = fromKey(schedule.config.startDate);
      return { year: start.getFullYear(), month0: start.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month0: now.getMonth() };
  });
  const [rowsOpen, setRowsOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const monthStats = useMemo(
    () => (schedule ? collectMonthStats(schedule, persons, cursor.year, cursor.month0) : null),
    [schedule, persons, cursor]
  );
  const totalStats = useMemo(() => (schedule ? collectStats(schedule, persons) : null), [schedule, persons]);

  if (!schedule) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-gray-700">找不到这张排班表（可能已被删除）</p>
        <div className="mt-4">
          <Link href="/schedules">
            <Button variant="primary">返回排班表列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isActive = schedule.id === activeScheduleId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/schedules" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{schedule.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {schedule.config.startDate} ~ {schedule.config.endDate} · {schedule.entries.length} 天 ·{' '}
            {schedule.personIds.length} 人
            {schedule.config.skipWeekends && ' · 跳过周末'}
            {schedule.config.dutyType === 'weekly' && ' · 每周一人'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isActive && (
            <Button
              onClick={() => {
                setActiveSchedule(schedule.id);
                push('success', '已设为当前排班表');
              }}
            >
              设为当前
            </Button>
          )}
          <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={() => setRowsOpen(true)}>
            导出
          </Button>
        </div>
      </div>

      {totalStats && totalStats.unassignedDays > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          这张表里有 {totalStats.unassignedDays} 天没有可用人员（当天所有人都被设为不可排或名单为空）。
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <MonthNav
            year={cursor.year}
            month0={cursor.month0}
            onChange={(year, month0) => setCursor({ year, month0 })}
            right={<span className="text-sm text-gray-400">绿色为二十四节气</span>}
          />
          <div ref={calendarRef} className="bg-white">
            <CalendarGrid year={cursor.year} month0={cursor.month0} entries={entries} personLookup={personLookup} />
          </div>
          <CalendarLegend personIds={schedule.personIds} personLookup={personLookup} />
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
              <ListChecks className="h-5 w-5 text-blue-600" />
              {cursor.year}年{cursor.month0 + 1}月
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              已排 {monthStats?.assignedDays ?? 0} 天
              {monthStats && monthStats.unassignedDays > 0 && `，无人可排 ${monthStats.unassignedDays} 天`}
            </p>
            <PersonBars items={monthStats?.perPerson ?? []} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-800">全周期</h2>
            <p className="mt-1 text-sm text-gray-500">
              共 {totalStats?.assignedDays ?? 0} 天 · {totalStats?.involvedPersons ?? 0} 人参与
            </p>
            <PersonBars items={totalStats?.perPerson ?? []} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-800">规则</h2>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>轮换：{{ sequential: '正序', reverse: '倒序', random: '随机起点' }[schedule.config.rotationStrategy]}</li>
              <li>粒度：{schedule.config.dutyType === 'weekly' ? '每 7 天一人' : '每天一人'}</li>
              <li>周末：{schedule.config.skipWeekends ? '跳过' : '照常排班'}</li>
              {schedule.config.seed !== undefined && (
                <li className="font-mono text-xs text-gray-400">seed {schedule.config.seed}</li>
              )}
              <li className="flex items-center gap-1 text-gray-500">
                <Check className="h-3.5 w-3.5 text-green-600" />
                同一张表重算结果一致（种子固定）
              </li>
            </ul>
          </div>
        </section>
      </div>

      <ExportDialog
        open={rowsOpen}
        onClose={() => setRowsOpen(false)}
        schedule={schedule}
        personLookup={personLookup}
        calendarRef={calendarRef}
        currentMonth={cursor}
      />
    </div>
  );
}

function PersonBars({ items }: { items: Array<{ personId: string; name: string; color: string; days: number }> }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-gray-400">暂无记录</p>;
  const max = items[0].days || 1;
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item.personId} className="flex items-center gap-2">
          <span className="w-16 shrink-0 truncate text-sm text-gray-700">{item.name}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <span className="block h-full rounded-full" style={{ width: `${(item.days / max) * 100}%`, backgroundColor: item.color }} />
          </span>
          <span className={cn('w-10 shrink-0 text-right text-sm text-gray-600')}>{item.days} 天</span>
        </div>
      ))}
    </div>
  );
}

export default function ScheduleDetailPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-500">正在加载…</div>}>
      <ScheduleDetail />
    </Suspense>
  );
}
