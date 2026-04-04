'use client';

import { useState } from 'react';
import { Schedule, Person, ExportOptions } from '@/types';
import { ExportManager } from '@/lib/export';
import { Download, FileText, FileSpreadsheet, FileCode, FileType } from 'lucide-react';

interface ExportPanelProps {
  schedule: Schedule | null;
  persons: Person[];
}

export function ExportPanel({ schedule, persons }: ExportPanelProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    template: 'standard',
    includeHeader: true,
    includeFooter: true,
    fontSize: 12,
    primaryColor: '#3b82f6',
  });

  const handleExport = () => {
    if (!schedule) return;

    const exporter = new ExportManager(schedule, persons);

    switch (options.format) {
      case 'pdf':
        exporter.exportToPDF(options);
        break;
      case 'excel':
        exporter.exportToExcel(options);
        break;
      case 'word':
        exporter.exportToWord(options);
        break;
    }
  };

  if (!schedule) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Download className="w-5 h-5" />
          导出排班表
        </h2>
        <div className="text-center py-8 text-gray-500">
          请先生成排班表
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
        <Download className="w-5 h-5" />
        导出排班表
      </h2>

      <div className="space-y-4">
        {/* 导出格式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            导出格式
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setOptions({ ...options, format: 'pdf' })}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                options.format === 'pdf'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm">PDF</span>
            </button>
            <button
              onClick={() => setOptions({ ...options, format: 'excel' })}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                options.format === 'excel'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <FileSpreadsheet className="w-6 h-6" />
              <span className="text-sm">Excel</span>
            </button>
            <button
              onClick={() => setOptions({ ...options, format: 'word' })}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                options.format === 'word'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <FileType className="w-6 h-6" />
              <span className="text-sm">Word</span>
            </button>
          </div>
        </div>

        {/* 模板选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            表格模板
          </label>
          <select
            value={options.template}
            onChange={(e) =>
              setOptions({
                ...options,
                template: e.target.value as ExportOptions['template'],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="standard">标准模板</option>
            <option value="compact">紧凑模板</option>
            <option value="detailed">详细模板</option>
          </select>
        </div>

        {/* 选项 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.includeHeader}
              onChange={(e) =>
                setOptions({ ...options, includeHeader: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">包含表头</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.includeFooter}
              onChange={(e) =>
                setOptions({ ...options, includeFooter: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">包含页脚</span>
          </label>
        </div>

        {/* 字体大小 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            字体大小: {options.fontSize}px
          </label>
          <input
            type="range"
            min="8"
            max="16"
            value={options.fontSize}
            onChange={(e) =>
              setOptions({ ...options, fontSize: parseInt(e.target.value) })
            }
            className="w-full"
          />
        </div>

        {/* 主题颜色 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            主题颜色
          </label>
          <div className="flex gap-2 flex-wrap">
            {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map(
              (color) => (
                <button
                  key={color}
                  onClick={() => setOptions({ ...options, primaryColor: color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    options.primaryColor === color
                      ? 'border-gray-800 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              )
            )}
          </div>
        </div>

        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          导出 {schedule.name}
        </button>

        {/* JSON 导出 */}
        <button
          onClick={() => {
            if (schedule) {
              const exporter = new ExportManager(schedule, persons);
              exporter.exportToJSON();
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <FileCode className="w-4 h-4" />
          导出 JSON 数据
        </button>
      </div>
    </div>
  );
}
