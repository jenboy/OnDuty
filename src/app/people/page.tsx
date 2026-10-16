'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  CalendarX,
  FileUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { Person } from '@/domain/types';
import { WEEKDAY_NAMES } from '@/domain/date';
import { useAppStore, useArchivedPersons, usePersons } from '@/store/useAppStore';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { PersonFormDialog, type PersonFormState } from '@/components/people/PersonFormDialog';
import { BatchImportDialog } from '@/components/people/BatchImportDialog';
import { cn } from '@/lib/cn';

export default function PeoplePage() {
  const persons = usePersons();
  const archived = useArchivedPersons();
  const addPerson = useAppStore((s) => s.addPerson);
  const updatePerson = useAppStore((s) => s.updatePerson);
  const setPersonActive = useAppStore((s) => s.setPersonActive);
  const archivePerson = useAppStore((s) => s.archivePerson);
  const restorePerson = useAppStore((s) => s.restorePerson);
  const reorderPersons = useAppStore((s) => s.reorderPersons);
  const { push } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Person | null>(null);

  const activeList = useMemo(() => persons.filter((p) => !p.archivedAt), [persons]);

  const move = (id: string, delta: number) => {
    const ids = activeList.map((p) => p.id);
    const index = ids.indexOf(id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorderPersons(ids);
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = activeList.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    reorderPersons(ids);
    setDragId(null);
    setOverId(null);
  };

  const handleSubmit = (values: PersonFormState) => {
    if (editing) {
      updatePerson(editing.id, {
        name: values.name,
        department: values.department || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        color: values.color,
        isActive: values.isActive,
        excludedDays: values.excludedDays,
      });
      push('success', `已更新「${values.name}」`);
    } else {
      addPerson({
        name: values.name,
        department: values.department,
        phone: values.phone,
        email: values.email,
        color: values.color,
        isActive: values.isActive,
        excludedDays: values.excludedDays,
      });
      push('success', `已添加「${values.name}」`);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">人员管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            名单里的顺序就是「正序轮换」的顺序 —— 拖动或用箭头调整；把人归档不会影响历史排班表。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={<FileUp className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
            批量导入
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            添加人员
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
          <UserRound className="h-5 w-5 text-blue-600" />
          在册人员（{activeList.length}）
        </h2>

        {activeList.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            还没有人员，点右上角「添加人员」开始。
            <div className="mt-3">
              <Link href="/schedules">
                <Button size="sm">去排班表</Button>
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {activeList.map((person, index) => (
              <li
                key={person.id}
                draggable
                onDragStart={() => setDragId(person.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverId(person.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropOn(person.id);
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors',
                  dragId === person.id ? 'border-blue-400 opacity-60' : 'border-gray-200 hover:border-blue-300',
                  overId === person.id && dragId !== person.id && 'border-dashed border-blue-400'
                )}
              >
                <span className="cursor-grab text-gray-300 active:cursor-grabbing" aria-hidden="true">
                  <GripVertical className="h-4 w-4" />
                </span>
                <span className="w-4 shrink-0 rounded-full" style={{ backgroundColor: person.color ?? '#3b82f6', height: '1rem' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{person.name}</span>
                    <span className="text-xs text-gray-400">#{index + 1}</span>
                    {person.department && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{person.department}</span>
                    )}
                    {!person.isActive && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">已停用</span>
                    )}
                    {person.excludedDays.length > 0 && (
                      <span className="flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                        <CalendarX className="h-3 w-3" />
                        不排 {person.excludedDays.map((d) => WEEKDAY_NAMES[d]).join('、')}
                      </span>
                    )}
                  </div>
                  {(person.phone || person.email) && (
                    <p className="mt-0.5 truncate text-sm text-gray-500">
                      {[person.phone, person.email].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <IconButton label="上移" icon={<ArrowUp className="h-4 w-4" />} onClick={() => move(person.id, -1)} disabled={index === 0} />
                  <IconButton
                    label="下移"
                    icon={<ArrowDown className="h-4 w-4" />}
                    onClick={() => move(person.id, 1)}
                    disabled={index === activeList.length - 1}
                  />
                  <button
                    type="button"
                    onClick={() => setPersonActive(person.id, !person.isActive)}
                    className={cn(
                      'rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                      person.isActive ? 'text-green-700 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                    )}
                  >
                    {person.isActive ? '参与排班' : '已停用'}
                  </button>
                  <IconButton
                    label="编辑"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => {
                      setEditing(person);
                      setFormOpen(true);
                    }}
                  />
                  <IconButton
                    label="归档"
                    icon={<Archive className="h-4 w-4" />}
                    onClick={() => {
                      archivePerson(person.id);
                      push('info', `「${person.name}」已归档：不再参与新排班，历史排班照常显示`);
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-800">
            <Archive className="h-5 w-5 text-gray-400" />
            已归档（{archived.length}）
          </h2>
          <p className="mb-4 text-sm text-gray-500">归档的人不参与新排班，但历史排班表里仍会显示他们的名字与颜色。</p>
          <ul className="space-y-2">
            {archived.map((person) => (
              <li key={person.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <span className="h-4 w-4 shrink-0 rounded-full opacity-60" style={{ backgroundColor: person.color ?? '#3b82f6' }} />
                <span className="flex-1 truncate text-sm text-gray-600">{person.name}</span>
                <Button
                  size="sm"
                  icon={<ArchiveRestore className="h-4 w-4" />}
                  onClick={() => {
                    restorePerson(person.id);
                    push('success', `「${person.name}」已恢复参与排班`);
                  }}
                >
                  恢复
                </Button>
                <IconButton
                  label="彻底删除"
                  icon={<Trash2 className="h-4 w-4" />}
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setPendingDelete(person)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {formOpen && (
        <PersonFormDialog
          person={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {importOpen && <BatchImportDialog onClose={() => setImportOpen(false)} />}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="彻底删除这个人？"
        danger
        confirmLabel="彻底删除"
        message={
          <>
            删除后，历史排班表里属于 TA 的日期会显示为「（已删除的人员）」，且无法恢复。
            <br />
            如果只是想停用，用「归档」就好。
          </>
        }
        onConfirm={() => {
          if (pendingDelete) {
            useAppStore.setState((state) => ({
              persons: state.persons.filter((p) => p.id !== pendingDelete.id),
            }));
            push('info', `已彻底删除「${pendingDelete.name}」`);
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
