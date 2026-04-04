'use client';

import { useState } from 'react';
import { Person, ScheduleConfig, Schedule, RotationStrategy } from '@/types';
import { SchedulerEngine, generateId, formatDate } from '@/lib';
import { Calendar, Settings, Play, AlertCircle } from 'lucide-react';

interface ScheduleGeneratorProps {
  persons: Person[];
  onGenerate: (schedule: Schedule) => void;
}

export function ScheduleGenerator({ persons, onGenerate }: ScheduleGeneratorProps) {
  const [config, setConfig] = useState<ScheduleConfig>({
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date(new Date().setMonth(new Date().getMonth() + 1))),
    rotationStrategy: 'sequential',
    dutyType: 'daily',
    skipWeekends: true,
    skipHolidays: true,
  });
  const [scheduleName, setScheduleName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const activePersons = persons.filter((p) => p.isActive);

  const handleGenerate = () => {
    const newErrors: string[] = [];

    if (!scheduleName.trim()) {
      newErrors.push('请输入排班表名称');
    }

    if (activePersons.length === 0) {
      newErrors.push('请至少添加一个启用状态的人员');
    }

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);

    if (start > end) {
      newErrors.push('开始日期不能晚于结束日期');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);

    // 生成排班
    const engine = new SchedulerEngine(activePersons, [], config);
    const entries = engine.generateSchedule();

    const schedule: Schedule = {
      id: generateId(),
      name: scheduleName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
      entries,
      personIds: activePersons.map((p) => p.id),
    };

    onGenerate(schedule);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5" />
        排班设置
      </h2>

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">请检查以下问题：</span>
          </div>
          <ul className="list-disc list-inside text-sm text-red-600">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            排班表名称 *
          </label>
          <input
            type="text"
            value={scheduleName}
            onChange={(e) => setScheduleName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例如：2024年3月值班表"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始日期 *
            </label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) =>
                setConfig({ ...config, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束日期 *
            </label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) =>
                setConfig({ ...config, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            轮换策略
          </label>
          <select
            value={config.rotationStrategy}
            onChange={(e) =>
              setConfig({
                ...config,
                rotationStrategy: e.target.value as RotationStrategy,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="sequential">正序轮换</option>
            <option value="reverse">倒序轮换</option>
            <option value="random">随机轮换</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={config.skipWeekends}
              onChange={(e) =>
                setConfig({ ...config, skipWeekends: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">跳过周末</span>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={config.skipHolidays}
              onChange={(e) =>
                setConfig({ ...config, skipHolidays: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">跳过节假日</span>
          </label>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">排班预览</span>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p>参与人员：{activePersons.length} 人</p>
            <p>
              排班周期：{config.startDate} 至 {config.endDate}
            </p>
            <p>
              轮换方式：
              {config.rotationStrategy === 'sequential'
                ? '正序轮换'
                : config.rotationStrategy === 'reverse'
                ? '倒序轮换'
                : '随机轮换'}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={activePersons.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          生成排班表
        </button>
      </div>
    </div>
  );
}
