import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnDuty - 值日排班系统",
  description: "OnDuty 智能值日排班管理系统 - 支持多种轮换策略、节假日避让、多格式导出",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
