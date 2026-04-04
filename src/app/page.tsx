'use client';

import { useState, useEffect } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { PersonManager } from '@/components/PersonManager';
import { ScheduleGenerator } from '@/components/ScheduleGenerator';
import { CalendarView } from '@/components/CalendarView';
import { AuthPage } from '@/components/AuthPage';
import { Schedule, Person } from '@/types';
import { storage } from '@/lib/storage';
import {
  Users,
  Calendar,
  Settings,
  Download,
  Menu,
  X,
  Trash2,
  RotateCcw,
  Database,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'persons' | 'schedule' | 'calendar' | 'export' | 'holidays';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('persons');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 检查认证状态
  useEffect(() => {
    setIsAuthenticated(storage.isAuthenticated());
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    storage.logout();
    setIsAuthenticated(false);
  };

  const {
    persons,
    schedules,
    currentSchedule,
    isLoaded,
    addPerson,
    updatePerson,
    deletePerson,
    reorderPersons,
    saveSchedule,
    deleteSchedule,
    setCurrentSchedule,
    exportData,
    importData,
    clearAll,
  } = useStorage();

  const handleGenerateSchedule = (schedule: Schedule) => {
    saveSchedule(schedule);
    setActiveTab('calendar');
  };

  const handleLoadSchedule = (schedule: Schedule) => {
    setCurrentSchedule(schedule);
    setActiveTab('calendar');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (importData(content)) {
          alert('数据导入成功！');
        } else {
          alert('数据导入失败，请检查文件格式。');
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { id: 'persons' as TabType, label: '人员管理', icon: Users },
    { id: 'schedule' as TabType, label: '排班设置', icon: Settings },
    { id: 'calendar' as TabType, label: '日历视图', icon: Calendar },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">OnDuty 值日排班</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDataModal(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title="数据管理"
              >
                <Database className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden border-t border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              退出登录
            </button>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'persons' && (
              <PersonManager
                persons={persons}
                onAdd={addPerson}
                onUpdate={updatePerson}
                onDelete={deletePerson}
                onReorder={reorderPersons}
              />
            )}

            {activeTab === 'schedule' && (
              <ScheduleGenerator
                persons={persons}
                onGenerate={handleGenerateSchedule}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView schedule={currentSchedule} persons={persons} />
            )}





            {/* 历史排班表 */}
            {schedules.length > 0 && activeTab !== 'export' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  历史排班表 ({schedules.length})
                </h3>
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                        currentSchedule?.id === schedule.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      )}
                      onClick={() => handleLoadSchedule(schedule)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {schedule.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {schedule.config.startDate} 至{
                            schedule.config.endDate
                          } · {schedule.entries.length} 天
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('确定要删除这个排班表吗？')) {
                            deleteSchedule(schedule.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">统计信息</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">总人数</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {persons.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">启用人员</span>
                  <span className="text-2xl font-bold text-green-600">
                    {persons.filter((p) => p.isActive).length}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">排班表</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {schedules.length}
                  </span>
                </div>
              </div>
            </div>

            {currentSchedule && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  当前排班
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">名称</span>
                    <span className="font-medium">{currentSchedule.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">周期</span>
                    <span className="font-medium">
                      {currentSchedule.entries.length} 天
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">参与人员</span>
                    <span className="font-medium">
                      {currentSchedule.personIds.length} 人
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">创建时间</span>
                    <span className="font-medium">
                      {new Date(currentSchedule.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">快速操作</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('persons')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4" />
                  管理人员
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  生成排班
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-4"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Data Management Modal */}
      {showDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">数据管理</h3>
              <button
                onClick={() => setShowDataModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  导出数据
                </label>
                <button
                  onClick={() => {
                    const data = exportData();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `onduty-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出备份
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  导入数据
                </label>
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                  选择备份文件
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
                      clearAll();
                      setShowDataModal(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  清空所有数据
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
