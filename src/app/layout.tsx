import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'OnDuty - 值日排班系统',
  description: '值日排班管理：人员管理、轮换策略、农历与二十四节气、Excel/Word/图片导出（数据保存在本机浏览器）',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-100 antialiased">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
