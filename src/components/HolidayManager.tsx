'use client';

import { useState } from 'react';
import { Holiday } from '@/types';
import { Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HolidayManagerProps {
  holidays: Holiday[];
  onAdd: (holiday: Omit<Holiday, 'id'>) => void;
  onDelete: (id: string) => void;
}

export function HolidayManager({
  holidays,
  onAdd,
  onDelete,
}: HolidayManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'once' as Holiday['type'],
    isWorkday: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setIsAdding(false);
    setFormData({
      name: '',
      date: '',
      type: 'once',
      isWorkday: false,
    });
  };

  const getTypeLabel = (type: Holiday['type']) => {
    switch (type) {
      case 'once':
        return '单次';
      case 'yearly':
        return '每年重复';
      case 'monthly':
        return '每月重复';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          节假日设置
          <span className="text-sm font-normal text-gray-500">
            ({holidays.length} 个)
          </span>
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加节假日
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                节假日名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如：国庆节"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期 *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                重复类型
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as Holiday['type'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="once">单次</option>
                <option value="yearly">每年重复</option>
                <option value="monthly">每月重复</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isWorkday}
                onChange={(e) =>
                  setFormData({ ...formData, isWorkday: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">调休工作日</span>
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {holidays.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无节假日设置
          </div>
        ) : (
          holidays.map((holiday) => (
            <div
              key={holiday.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all',
                holiday.isWorkday
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  holiday.isWorkday ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {holiday.name}
                  </span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      holiday.isWorkday
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {holiday.isWorkday ? '工作日' : '休息日'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {holiday.date} · {getTypeLabel(holiday.type)}
                </div>
              </div>
              <button
                onClick={() => onDelete(holiday.id)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">提示</p>
            <ul className="list-disc list-inside space-y-1">
              <li>设置为「休息日」的节假日会自动跳过排班</li>
              <li>设置为「工作日」的节假日会正常排班（用于调休）</li>
              <li>每年重复的节假日会自动应用到后续年份</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
