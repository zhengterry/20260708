'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '首页', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { name: '扫描品控', href: '/scan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { name: '异常上报', href: '/tickets/create', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
  { name: '工单列表', href: '/tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { name: '审批管理', href: '/approval', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { name: '接口监控', href: '/admin/monitor', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 h-screen overflow-y-auto border-r border-[#DFE7E8] bg-gradient-to-b from-white to-[#F6FBFB] py-8 px-5 w-[256px] flex-shrink-0 hidden lg:block">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-2.5 h-2.5 rounded-full bg-[#0FC6C2] shadow-[0_0_0_4px_#E1F5F4]" />
        <span className="text-xs tracking-[0.14em] text-[#7C8A92] uppercase font-semibold">V3 System</span>
      </div>
      <p className="text-[15px] font-bold text-[#16232B] mb-6 leading-relaxed">
        运单全流程管理系统
      </p>

      <nav className="flex flex-col gap-0.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] border-l-2 transition-colors duration-150',
                isActive
                  ? 'text-[#0AA6A3] bg-[#E1F5F4] border-l-[#0FC6C2] font-semibold'
                  : 'text-[#4A5A63] border-l-transparent hover:bg-[#EAFBFA] hover:text-[#0AA6A3]'
              )}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 pt-4 border-t border-dashed border-[#DFE7E8] text-[11px] text-[#7C8A92]">
        总分 100 分 · Vercel 部署
      </div>
    </aside>
  );
}
