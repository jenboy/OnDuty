'use client';

import { useState } from 'react';
import type { Person, Weekday } from '@/domain/types';
import { WEEKDAY_NAMES } from '@/domain/date';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, TextInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

export const PERSON_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

interface FormState {
  name: string;
  department: string;
  phone: string;
  email: string;
  color: string;
  isActive: boolean;
  excludedDays: Weekday[];
}

const EMPTY: FormState = {
  name: '',
  department: '',
  phone: '',
  email: '',
  color: PERSON_COLORS[0],
  isActive: true,
  excludedDays: [],
};

function toForm(person: Person | null): FormState {
  if (!person) return { ...EMPTY };
  return {
    name: person.name,
    department: person.department ?? '',
    phone: person.phone ?? '',
    email: person.email ?? '',
    color: person.color ?? PERSON_COLORS[0],
    isActive: person.isActive,
    excludedDays: [...person.excludedDays],
  };
}

export function PersonFormDialog({
  person,
  onClose,
  onSubmit,
}: {
  person: Person | null;
  onClose: () => void;
  onSubmit: (values: FormState) => void;
}) {
  // 每次打开都重新挂载，因此初始值直接取自入参，不需要用 effect 回写表单
  const [form, setForm] = useState<FormState>(() => toForm(person));
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  const toggleDay = (day: Weekday) => {
    setForm((prev) => ({
      ...prev,
      excludedDays: prev.excludedDays.includes(day)
        ? prev.excludedDays.filter((d) => d !== day)
        : [...prev.excludedDays, day].sort((a, b) => a - b),
    }));
  };

  const submit = () => {
    if (!form.name.trim()) {
      setError('请填写姓名');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('邮箱格式看起来不对');
      return;
    }
    if (form.excludedDays.length === 7) {
      push('error', '七天都设为不可排班，这个人永远不会被排到');
    }
    onSubmit({ ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={person ? '编辑人员' : '添加人员'}
      description={person ? undefined : '姓名必填；不可排班日期用于自动避开该星期的值班'}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={submit}>
            {person ? '保存修改' : '添加'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="姓名" required error={error ?? undefined}>
          <TextInput
            value={form.name}
            autoFocus
            placeholder="请输入姓名"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="部门">
            <TextInput
              value={form.department}
              placeholder="选填"
              onChange={(event) => setForm({ ...form, department: event.target.value })}
            />
          </Field>
          <Field label="电话">
            <TextInput
              value={form.phone}
              inputMode="tel"
              placeholder="选填"
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
        </div>

        <Field label="邮箱">
          <TextInput
            value={form.email}
            inputMode="email"
            placeholder="选填"
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">标识颜色</span>
          <div className="flex flex-wrap gap-2">
            {PERSON_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`选择颜色 ${color}`}
                aria-pressed={form.color === color}
                onClick={() => setForm({ ...form, color })}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-transform',
                  form.color === color ? 'scale-110 border-gray-800' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">不可排班的星期</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_NAMES.map((label, index) => {
              const day = index as Weekday;
              return (
                <Checkbox
                  key={day}
                  label={label}
                  checked={form.excludedDays.includes(day)}
                  onChange={() => toggleDay(day)}
                />
              );
            })}
          </div>
          {form.excludedDays.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              该人员不会被安排在 {form.excludedDays.map((d) => WEEKDAY_NAMES[d]).join('、')} 值班
            </p>
          )}
        </div>

        <Checkbox
          label="参与排班（取消勾选即停用）"
          checked={form.isActive}
          onChange={(checked) => setForm({ ...form, isActive: checked })}
        />
      </div>
    </Modal>
  );
}

export type { FormState as PersonFormState };
