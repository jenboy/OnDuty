'use client';

import { useState } from 'react';
import { Person } from '@/types';
import { Plus, Trash2, Edit2, GripVertical, User, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonManagerProps {
  persons: Person[];
  onAdd: (person: Omit<Person, 'id' | 'order'>) => void;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const WEEKDAYS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
];

export function PersonManager({
  persons,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: PersonManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    phone: '',
    email: '',
    color: COLORS[0],
    isActive: true,
    excludedDays: [] as number[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, formData);
      setEditingId(null);
    } else {
      onAdd(formData);
      setIsAdding(false);
    }
    setFormData({
      name: '',
      department: '',
      phone: '',
      email: '',
      color: COLORS[0],
      isActive: true,
      excludedDays: [],
    });
  };

  const handleEdit = (person: Person) => {
    setFormData({
      name: person.name,
      department: person.department || '',
      phone: person.phone || '',
      email: person.email || '',
      color: person.color || COLORS[0],
      isActive: person.isActive,
      excludedDays: person.excludedDays || [],
    });
    setEditingId(person.id);
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      department: '',
      phone: '',
      email: '',
      color: COLORS[0],
      isActive: true,
      excludedDays: [],
    });
  };

  const toggleExcludedDay = (day: number) => {
    const current = formData.excludedDays || [];
    if (current.includes(day)) {
      setFormData({ ...formData, excludedDays: current.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, excludedDays: [...current, day] });
    }
  };

  const getExcludedDaysLabel = (excludedDays?: number[]) => {
    if (!excludedDays || excludedDays.length === 0) return null;
    const labels = excludedDays
      .sort((a, b) => a - b)
      .map(d => WEEKDAYS.find(w => w.value === d)?.label)
      .filter(Boolean);
    return labels.join('、');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <User className="w-5 h-5" />
          人员管理
          <span className="text-sm font-normal text-gray-500">
            ({persons.length} 人)
          </span>
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加人员
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入姓名"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                部门
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入部门"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                电话
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入电话"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入邮箱"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标识颜色
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      formData.color === color
                        ? 'border-gray-800 scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarX className="w-4 h-4 inline mr-1" />
                不可排班日期（勾选该人员不可值班的星期）
              </label>
              <div className="flex gap-2 flex-wrap">
                {WEEKDAYS.map((day) => (
                  <label
                    key={day.value}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-all',
                      formData.excludedDays?.includes(day.value)
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.excludedDays?.includes(day.value)}
                      onChange={() => toggleExcludedDay(day.value)}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
              {formData.excludedDays && formData.excludedDays.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  该人员将不会被安排在 {getExcludedDaysLabel(formData.excludedDays)} 值班
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingId ? '保存修改' : '添加'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {persons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无人员，请点击上方按钮添加
          </div>
        ) : (
          persons.map((person, index) => (
            <div
              key={person.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all',
                person.isActive
                  ? 'bg-white border-gray-200 hover:border-blue-300'
                  : 'bg-gray-50 border-gray-100 opacity-60'
              )}
            >
              <div className="cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical className="w-4 h-4" />
              </div>
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: person.color || COLORS[0] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{person.name}</span>
                  {person.department && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {person.department}
                    </span>
                  )}
                  {!person.isActive && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">
                      已停用
                    </span>
                  )}
                  {person.excludedDays && person.excludedDays.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded flex items-center gap-1">
                      <CalendarX className="w-3 h-3" />
                      不排: {getExcludedDaysLabel(person.excludedDays)}
                    </span>
                  )}
                </div>
                {(person.phone || person.email) && (
                  <div className="text-sm text-gray-500 mt-0.5">
                    {person.phone && <span>{person.phone}</span>}
                    {person.phone && person.email && <span className="mx-2">|</span>}
                    {person.email && <span>{person.email}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    onUpdate(person.id, { isActive: !person.isActive })
                  }
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    person.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  )}
                  title={person.isActive ? '点击停用' : '点击启用'}
                >
                  <span className="text-xs font-medium">
                    {person.isActive ? '启用' : '停用'}
                  </span>
                </button>
                <button
                  onClick={() => handleEdit(person)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(person.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
