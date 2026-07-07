import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';

export const metadata: Metadata = {
  title: '运单全流程管理系统 V3',
  description: '录单 → 扫描品控 → 异常上报 → 分级审批 → 执行联动',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-[#FBFDFD] text-[#16232B] antialiased min-h-screen">
        <div className="flex max-w-[1400px] mx-auto">
          <Sidebar />
          <main className="flex-1 min-w-0 px-16 py-14 max-lg:px-6 max-lg:py-9">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
