'use client';

import { useState, useEffect } from 'react';
import { Person, ScheduleConfig, Schedule, RotationStrategy } from '@/types';
import { SchedulerEngine } from '@/lib/scheduler';
import { generateId, formatDate, getMonthEndDate, getWeekOfMonth, getMonthName } from '@/lib/utils';
import { Calendar, Settings, Play, AlertCircle, Wand2, X } from 'lucide-react';

interface ScheduleGeneratorProps {
  persons: Person[];
  onGenerate: (schedule: Schedule) => void;
}

function generateScheduleName(
  startDate: string,
  endDate: string,
  type: 'monthly' | 'weekly'
): string {
  const start = new Date(startDate);
  const year = start.getFullYear();
  const month = start.getMonth();
  const monthName = getMonthName(month);

  if (type === 'weekly') {
    const weekNum = getWeekOfMonth(start);
    return `${year}年${monthName}第${weekNum}周值日表`;
  }

  return `${year}年${monthName}值日表`;
}

export function ScheduleGenerator({ persons, onGenerate }: ScheduleGeneratorProps) {

  const today = new Date();
  const monthEnd = getMonthEndDate(today);
  const [config, setConfig] = useState<ScheduleConfig>({
    startDate: formatDate(today),
    endDate: formatDate(monthEnd),
    rotationStrategy: 'sequential',
    dutyType: 'daily',
    skipWeekends: false,
    skipHolidays: false,
  });
  const [scheduleName, setScheduleName] = useState('');
  const [nameFormat, setNameFormat] = useState<'monthly' | 'weekly'>('monthly');
  const [errors, setErrors] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const activePersons = persons.filter((p) => p.isActive);

  // 自动生成排班表名称
  const autoGenerateName = () => {
    const newName = generateScheduleName(config.startDate, config.endDate, nameFormat);
    setScheduleName(newName);
  };

  // 当日期或格式变化时，自动更新名称
  useEffect(() => {
    const suggestedName = generateScheduleName(config.startDate, config.endDate, nameFormat);
    setScheduleName(suggestedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.startDate, config.endDate, nameFormat]);

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

    // 显示确认弹窗
    setShowConfirmModal(true);
  };

  const confirmGenerate = () => {
    // 生成排班
    const engine = new SchedulerEngine(activePersons, config);
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
          <div className="flex gap-2">
            <input
              type="text"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入排班表名称"
            />
            <button
              type="button"
              onClick={autoGenerateName}
              className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              title="自动生成名称"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">自动填充</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始日期 *
            </label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => {
                const newStartDate = e.target.value;
                const startDateObj = new Date(newStartDate);
                const monthEndDate = getMonthEndDate(startDateObj);
                const newEndDate = formatDate(monthEndDate);
                setConfig({ ...config, startDate: newStartDate, endDate: newEndDate });
              }}
              onKeyDown={(e) => e.preventDefault()}
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
              onKeyDown={(e) => e.preventDefault()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            名称格式
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setNameFormat('monthly');
                setScheduleName(generateScheduleName(config.startDate, config.endDate, 'monthly'));
              }}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                nameFormat === 'monthly'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">月度格式</div>
              <div className="text-xs mt-1 opacity-75">2026年3月值日表</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setNameFormat('weekly');
                setScheduleName(generateScheduleName(config.startDate, config.endDate, 'weekly'));
              }}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                nameFormat === 'weekly'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">周度格式</div>
              <div className="text-xs mt-1 opacity-75">2026年3月第3周值日表</div>
            </button>
          </div>
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

      {/* 确认弹窗 */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-800">确认生成排班表</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">名称</span>
                  <span className="font-medium">{scheduleName}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">日期范围</span>
                  <span className="font-medium">{config.startDate} 至 {config.endDate}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">参与人员</span>
                  <span className="font-medium">{activePersons.length} 人</span>
                </div>
              </div>

              {/* 轮换策略选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  轮换策略
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'sequential', label: '正序轮换' },
                    { value: 'reverse', label: '倒序轮换' },
                    { value: 'random', label: '随机轮换' },
                  ].map((strategy) => (
                    <button
                      key={strategy.value}
                      onClick={() => setConfig({ ...config, rotationStrategy: strategy.value as RotationStrategy })}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        config.rotationStrategy === strategy.value
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {strategy.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 跳过周末选项 */}
              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={config.skipWeekends}
                  onChange={(e) => setConfig({ ...config, skipWeekends: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">跳过周末</span>
              </label>
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={confirmGenerate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                确认生成
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
