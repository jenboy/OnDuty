'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Play, RefreshCw, Wand2 } from 'lucide-react';
import type { DutyType, RotationStrategy, Schedule, ScheduleConfig } from '@/domain/types';
import { eachDay, fromKey, getMonthName, getWeekOfMonth, monthEndKey, todayKey } from '@/domain/date';
import { generateSchedule } from '@/domain/scheduler';
import { newId, useAppStore, usePersons } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, RadioGroup, TextInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

const MAX_DAYS = 731;

function suggestName(startDate: string, format: 'monthly' | 'weekly'): string {
  const date = fromKey(startDate);
  const base = `${date.getFullYear()}年${getMonthName(date.getMonth())}`;
  return format === 'weekly' ? `${base}第${getWeekOfMonth(startDate)}周值日表` : `${base}值日表`;
}

export function ScheduleWizard({ onClose }: { onClose: () => void }) {
  const persons = usePersons();
  const schedules = useAppStore((s) => s.schedules);
  const saveSchedule = useAppStore((s) => s.saveSchedule);
  const { push } = useToast();

  const activePersons = useMemo(() => persons.filter((p) => p.isActive && !p.archivedAt), [persons]);
  const previousSchedule = useMemo(
    () => [...schedules].sort((a, b) => b.config.endDate.localeCompare(a.config.endDate))[0] ?? null,
    [schedules]
  );

  const today = todayKey();
  const [nameFormat, setNameFormat] = useState<'monthly' | 'weekly'>('monthly');
  // null 表示"跟随日期自动命名"；用户一旦手动改过就存下来
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => monthEndKey(today));
  const [strategy, setStrategy] = useState<RotationStrategy>('sequential');
  const [dutyType, setDutyType] = useState<DutyType>('daily');
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [continueFromPrevious, setContinueFromPrevious] = useState(true);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [errors, setErrors] = useState<string[]>([]);

  const name = nameOverride ?? suggestName(startDate, nameFormat);

  const config: ScheduleConfig = useMemo(
    () => ({
      startDate,
      endDate,
      rotationStrategy: strategy,
      dutyType,
      skipWeekends,
      seed: strategy === 'random' ? seed : undefined,
    }),
    [startDate, endDate, strategy, dutyType, skipWeekends, seed]
  );

  const preview = useMemo(() => {
    if (activePersons.length === 0) return null;
    try {
      return generateSchedule({
        persons: activePersons,
        config,
        previousPersonId: continueFromPrevious ? (previousSchedule?.lastPersonId ?? null) : null,
      });
    } catch {
      return null;
    }
  }, [activePersons, config, continueFromPrevious, previousSchedule]);

  const dayCount = eachDay(startDate, endDate).length;

  const submit = () => {
    const problems: string[] = [];
    if (!name.trim()) problems.push('请填写排班表名称');
    if (activePersons.length === 0) problems.push('请先添加并启用至少一名人员');
    if (startDate > endDate) problems.push('开始日期不能晚于结束日期');
    if (dayCount > MAX_DAYS) problems.push(`区间太长（${dayCount} 天），请缩小到 ${MAX_DAYS} 天以内`);
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    const result = generateSchedule({
      persons: activePersons,
      config,
      previousPersonId: continueFromPrevious ? (previousSchedule?.lastPersonId ?? null) : null,
    });

    const schedule: Schedule = {
      id: newId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: { ...config, seed: result.seed },
      entries: result.entries,
      personIds: activePersons.map((p) => p.id),
      lastPersonId: result.lastPersonId,
    };

    saveSchedule(schedule);
    push('success', `已生成「${schedule.name}」，共 ${result.entries.length} 天`);
    if (result.warnings.length > 0) push('info', result.warnings.join('；'));
    onClose();
  };

  const sample = preview?.entries.slice(0, 7) ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title="生成排班表"
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" icon={<Play className="h-4 w-4" />} onClick={submit}>
            确认生成
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {errors.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.map((error) => (
              <li key={error}>· {error}</li>
            ))}
          </ul>
        )}

        <Field label="排班表名称" required>
          <div className="flex gap-2">
            <TextInput
              value={name}
              onChange={(event) => {
                setNameOverride(event.target.value);
              }}
            />
            <Button
              icon={<Wand2 className="h-4 w-4" />}
              onClick={() => {
                setNameOverride(null);
              }}
            >
              自动填充
            </Button>
          </div>
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">名称格式</span>
          <RadioGroup
            columns={2}
            value={nameFormat}
            onChange={(value) => {
              setNameFormat(value);
              setNameOverride(null);
            }}
            options={[
              { value: 'monthly', label: '月度', description: `${fromKey(startDate).getFullYear()}年${getMonthName(fromKey(startDate).getMonth())}值日表` },
              { value: 'weekly', label: '周度', description: `…第${getWeekOfMonth(startDate)}周值日表` },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="开始日期" required hint="可以选过去的日期，用于补排">
            <TextInput
              type="date"
              value={startDate}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                setStartDate(value);
                setEndDate(monthEndKey(value));
              }}
            />
          </Field>
          <Field label="结束日期" required hint={`共 ${dayCount} 天`}>
            <TextInput
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => event.target.value && setEndDate(event.target.value)}
            />
          </Field>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">轮换策略</span>
          <RadioGroup
            value={strategy}
            onChange={setStrategy}
            options={[
              { value: 'sequential', label: '正序轮换', description: '按名单顺序' },
              { value: 'reverse', label: '倒序轮换', description: '按名单逆序' },
              { value: 'random', label: '随机起点', description: '同种子可复现' },
            ]}
          />
          {strategy === 'random' && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <span>
                随机种子：<span className="font-mono">{seed}</span>（同一张表用同一种子，重算结果一致）
              </span>
              <Button size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}>
                换一个
              </Button>
            </div>
          )}
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">值班粒度</span>
          <RadioGroup
            columns={2}
            value={dutyType}
            onChange={setDutyType}
            options={[
              { value: 'daily', label: '每天一人', description: '最常用' },
              { value: 'weekly', label: '每 7 天一人', description: '从开始日期起算' },
            ]}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox label="跳过周末" checked={skipWeekends} onChange={setSkipWeekends} />
          <Checkbox
            label={`接上一张表（${previousSchedule?.name ?? '暂无'}）`}
            checked={continueFromPrevious && previousSchedule !== null}
            onChange={setContinueFromPrevious}
            className={previousSchedule ? undefined : 'pointer-events-none opacity-50'}
          />
        </div>

        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">预览</p>
          <p className="mt-1 text-blue-700">
            参与人员 {activePersons.length} 人 · 生成 {preview?.entries.length ?? 0} 天
            {preview && preview.entries.filter((e) => !e.personId).length > 0 && (
              <span className="ml-2 text-amber-700">
                其中 {preview.entries.filter((e) => !e.personId).length} 天无人可排
              </span>
            )}
          </p>
          {sample.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-blue-700">
              {sample.map((entry) => {
                const person = activePersons.find((p) => p.id === entry.personId);
                return (
                  <li key={entry.date}>
                    {entry.date} · {person?.name ?? '（无人可排）'}
                  </li>
                );
              })}
              {(preview?.entries.length ?? 0) > sample.length && <li className="text-blue-500">……</li>}
            </ul>
          )}
          {preview && preview.warnings.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
              {preview.warnings.map((warning) => (
                <li key={warning} className="flex items-start gap-1">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
