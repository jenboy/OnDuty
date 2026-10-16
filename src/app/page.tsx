'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CalendarPlus, Download, ListChecks } from 'lucide-react';
import { collectMonthStats, collectStats } from '@/domain/stats';
import { fromKey, todayKey } from '@/domain/date';
import { getDayLunar } from '@/domain/lunar';
import { useActiveSchedule, usePersonLookup, useSchedules } from '@/store/useAppStore';
import { CalendarGrid, CalendarLegend } from '@/components/calendar/CalendarGrid';
import { MonthNav } from '@/components/calendar/MonthNav';
import { useEntryMap } from '@/components/calendar/useEntryMap';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const schedules = useSchedules();
  const activeSchedule = useActiveSchedule();
  const personLookup = usePersonLookup();

  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const now = fromKey(today);
    return { year: now.getFullYear(), month0: now.getMonth() };
  });

  const schedule = activeSchedule ?? schedules[0] ?? null;
  const entries = useEntryMap(schedule);
  const persons = useMemo(() => Object.values(personLookup), [personLookup]);

  const todayEntry = entries.get(today);
  const todayPerson = todayEntry?.personId ? personLookup[todayEntry.personId] : undefined;
  const todayLunar = getDayLunar(today);

  const monthStats = useMemo(
    () => (schedule ? collectMonthStats(schedule, persons, cursor.year, cursor.month0) : null),
    [schedule, persons, cursor]
  );
  const totalStats = useMemo(() => (schedule ? collectStats(schedule, persons) : null), [schedule, persons]);

  if (!schedule) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <CalendarDays className="mx-auto h-10 w-10 text-blue-600" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">还没有排班表</h1>
        <p className="mt-2 text-sm text-gray-500">
          先在「人员」里录入参与值班的同事，再到「排班表」生成第一张值日表。数据只保存在这台设备的浏览器里。
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/people">
            <Button>录入人员</Button>
          </Link>
          <Link href="/schedules">
            <Button variant="primary" icon={<CalendarPlus className="h-4 w-4" />}>
              生成排班表
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">今天值班</h2>
          <p className="mt-1 text-xs text-gray-400">
            {today} · {todayLunar.jieQi ?? todayLunar.full}
          </p>

          <div className="mt-4">
            {todayEntry ? (
              todayEntry.personId ? (
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ backgroundColor: todayPerson?.color ?? '#3b82f6' }}
                  >
                    {(todayPerson?.name ?? '?').slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{todayPerson?.name ?? '（已删除的人员）'}</p>
                    {todayPerson?.department && <p className="text-sm text-gray-500">{todayPerson.department}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-lg font-medium text-gray-400">今天没有可用人员</p>
              )
            ) : (
              <p className="text-sm text-gray-400">今天不在「{schedule.name}」的排班范围内</p>
            )}
          </div>

          <dl className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">当前排班表</dt>
              <dd className="max-w-[11rem] truncate font-medium text-gray-800">{schedule.name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">周期</dt>
              <dd className="font-medium text-gray-800">
                {schedule.config.startDate} ~ {schedule.config.endDate}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">全周期</dt>
              <dd className="font-medium text-gray-800">
                {totalStats?.assignedDays ?? 0} 天 / {totalStats?.involvedPersons ?? 0} 人
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/schedule?id=${encodeURIComponent(schedule.id)}`}>
              <Button size="sm" variant="primary" icon={<Download className="h-4 w-4" />}>
                查看与导出
              </Button>
            </Link>
            <Link href="/schedules">
              <Button size="sm" icon={<CalendarPlus className="h-4 w-4" />}>
                新建排班表
              </Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <MonthNav
            year={cursor.year}
            month0={cursor.month0}
            onChange={(year, month0) => setCursor({ year, month0 })}
            right={<span className="text-sm text-gray-400">绿色为二十四节气</span>}
          />
          <CalendarGrid year={cursor.year} month0={cursor.month0} entries={entries} personLookup={personLookup} />
          <CalendarLegend personIds={schedule.personIds} personLookup={personLookup} />
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <ListChecks className="h-5 w-5 text-blue-600" />
            本月值班统计
          </h2>
          <span className="text-sm text-gray-500">
            已排 {monthStats?.assignedDays ?? 0} 天
            {monthStats && monthStats.unassignedDays > 0 && (
              <span className="ml-2 text-amber-600">无人可排 {monthStats.unassignedDays} 天</span>
            )}
          </span>
        </div>
        {monthStats && monthStats.perPerson.length > 0 ? (
          <div className="space-y-3">
            {monthStats.perPerson.map((item) => {
              const max = monthStats.perPerson[0].days || 1;
              return (
                <div key={item.personId} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-sm text-gray-700">{item.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(item.days / max) * 100}%`, backgroundColor: item.color }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right text-sm font-medium text-gray-700">{item.days} 天</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">这个月没有排班记录</p>
        )}
      </section>
    </div>
  );
}
