'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Database, Users, LayoutList, Home } from 'lucide-react';
import { bootstrapData, type BootstrapReport } from '@/store/bootstrap';
import { useAppStore, useHydrated } from '@/store/useAppStore';
import { downloadBackup, parseBackupFile } from '@/store/backup';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Modal } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/', label: '首页', icon: Home },
  { href: '/schedules', label: '排班表', icon: LayoutList },
  { href: '/people', label: '人员', icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const setHydrated = useAppStore((s) => s.setHydrated);
  const pathname = usePathname();
  const { push } = useToast();
  const [report, setReport] = useState<BootstrapReport | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ data: ReturnType<typeof parseBackupFile>; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    bootstrapData()
      .then((result) => {
        if (cancelled) return;
        setReport(result);
        setHydrated(true);
        if (result.migrated && result.migration) {
          const { persons, schedules } = result.migration.summary;
          push('success', `已从旧版本迁移：${persons} 人、${schedules} 张排班表（旧数据已备份为 ${result.migration.backupKey}）`);
        } else if (result.legacyParseFailed) {
          push('error', '检测到旧版数据但无法解析，已保持原样未改动');
        }
        if (result.storage === 'memory') {
          push('error', '浏览器不支持 IndexedDB，本次数据只保存在内存中，请及时导出备份');
        }
      })
      .catch((error: unknown) => {
        setHydrated(true);
        push('error', `初始化失败：${error instanceof Error ? error.message : String(error)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [push, setHydrated]);

  const handleExport = () => {
    const { persons, schedules, activeScheduleId } = useAppStore.getState();
    downloadBackup({ persons, schedules, activeScheduleId });
    push('success', '备份文件已开始下载');
  };

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setPendingImport({ data: parseBackupFile(text), name: file.name });
  };

  const confirmImport = () => {
    if (pendingImport?.data.ok) {
      useAppStore.getState().replaceAll(pendingImport.data.file.data);
      const { persons, schedules } = pendingImport.data.file.data;
      push('success', `已导入备份：${persons.length} 人、${schedules.length} 张排班表`);
    }
    setPendingImport(null);
    setBackupOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <CalendarDays className="h-6 w-6 text-white" />
            </span>
            <span className="text-lg font-bold text-gray-900">OnDuty 值日排班</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 sm:flex" aria-label="主导航">
              {NAV.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Button size="sm" icon={<Database className="h-4 w-4" />} onClick={() => setBackupOpen(true)}>
              数据
            </Button>
          </div>
        </div>

        {/* 小屏导航 */}
        <nav className="flex items-center gap-1 border-t border-gray-200 px-4 py-2 sm:hidden" aria-label="主导航">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {report?.storage === 'memory' && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            当前浏览器不支持 IndexedDB，数据只保存在内存中 —— 关闭页面即丢失，请用右上角「数据」导出备份。
          </div>
        )}
        {hydrated ? children : <div className="py-16 text-center text-gray-500">正在加载本地数据…</div>}
      </main>

      <Modal
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        title="数据备份"
        description="数据只保存在这个浏览器里，建议定期导出备份文件"
        footer={
          <>
            <Button onClick={handleExport}>导出备份</Button>
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              从备份恢复
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>导出的 JSON 文件包含全部人员、排班表与当前选中项，可在任意设备上导入。</p>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            导入会<strong>覆盖</strong>当前浏览器里的全部数据，导入前建议先导出一份。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              void handlePickFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingImport !== null}
        title="确认导入备份"
        danger
        confirmLabel="覆盖并导入"
        message={
          pendingImport?.data.ok ? (
            <div className="space-y-2">
              <p>
                文件：<span className="font-medium">{pendingImport.name}</span>
              </p>
              <p>
                包含 {pendingImport.data.file.data.persons.length} 人、
                {pendingImport.data.file.data.schedules.length} 张排班表。
              </p>
              <p className="text-red-600">导入会覆盖当前浏览器里的全部数据。</p>
            </div>
          ) : (
            <p className="text-red-600">
              无法导入：{pendingImport && !pendingImport.data.ok ? pendingImport.data.error : '文件无效'}
            </p>
          )
        }
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  );
}
