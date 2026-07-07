'use client';

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

interface SyncLog {
  id: number;
  apiName: string;
  method: string;
  responseStatus: number;
  durationMs: number;
  isSuccess: boolean;
  errorMessage?: string;
  createdAt: string;
}

const MOCK_LOGS: SyncLog[] = [
  { id: 1, apiName: 'getWaybill', method: 'GET', responseStatus: 200, durationMs: 145, isSuccess: true, createdAt: '2026-07-06T16:20:00Z' },
  { id: 2, apiName: 'checkSku', method: 'GET', responseStatus: 200, durationMs: 89, isSuccess: true, createdAt: '2026-07-06T16:18:00Z' },
  { id: 3, apiName: 'listWaybills', method: 'GET', responseStatus: 200, durationMs: 1203, isSuccess: true, createdAt: '2026-07-06T16:00:00Z' },
  { id: 4, apiName: 'listWaybills', method: 'GET', responseStatus: 500, durationMs: 10001, isSuccess: false, errorMessage: 'Internal Server Error', createdAt: '2026-07-06T15:30:00Z' },
  { id: 5, apiName: 'getWaybill', method: 'GET', responseStatus: 0, durationMs: 10000, isSuccess: false, errorMessage: '请求超时', createdAt: '2026-07-06T15:29:00Z' },
];

export default function MonitorPage() {
  const [logs, setLogs] = useState<SyncLog[]>(MOCK_LOGS);

  const successCount = logs.filter(l => l.isSuccess).length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100;
  const avgDuration = logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.durationMs, 0) / logs.length) : 0;

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-[#DFE7E8]">
        <h1 className="text-2xl font-bold text-[#16232B] mb-1">接口监控 </h1>
        <p className="text-sm text-[#7C8A92]">V3 ↔ V2 接口调用日志与数据同步状态</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8 max-lg:grid-cols-2">
        <div className="bg-white border border-[#DFE7E8] rounded-2xl p-5">
          <p className="text-xs text-[#7C8A92] font-semibold uppercase">同步成功率</p>
          <p className={`text-3xl font-bold mt-1 ${successRate >= 90 ? 'text-green-500' : successRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {successRate}%
          </p>
        </div>
        <div className="bg-white border border-[#DFE7E8] rounded-2xl p-5">
          <p className="text-xs text-[#7C8A92] font-semibold uppercase">调用次数</p>
          <p className="text-3xl font-bold text-[#16232B] mt-1">{logs.length}</p>
        </div>
        <div className="bg-white border border-[#DFE7E8] rounded-2xl p-5">
          <p className="text-xs text-[#7C8A92] font-semibold uppercase">平均耗时</p>
          <p className="text-3xl font-bold text-[#16232B] mt-1">{avgDuration}<span className="text-sm font-normal">ms</span></p>
        </div>
        <div className="bg-white border border-[#DFE7E8] rounded-2xl p-5">
          <p className="text-xs text-[#7C8A92] font-semibold uppercase">最近同步</p>
          <p className="text-sm font-bold text-[#16232B] mt-1">{formatDateTime(logs[0]?.createdAt || new Date())}</p>
        </div>
      </div>

      {/* Data Source Note */}
      <div className="mb-6 p-4 bg-blue-50 border-l-3 border-blue-400 rounded-r-xl text-sm text-[#4A5A63]">
        <strong className="text-blue-600">数据来源说明：</strong>每次同步记录包含 Request ID，可通过 ID 在日志中还原完整调用链。
        数据来源分为 <span className="font-semibold text-green-600">实时获取自 V2</span>（关键操作）和 <span className="font-semibold text-amber-600">使用本地缓存</span>（列表展示）两种。
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto border border-[#DFE7E8] rounded-xl shadow-sm">
        <table className="w-full text-sm bg-white">
          <thead>
            <tr className="bg-[#16232B] text-white">
              <th className="text-left px-4 py-3 font-semibold rounded-tl-xl">时间</th>
              <th className="text-left px-4 py-3 font-semibold">接口名</th>
              <th className="text-left px-4 py-3 font-semibold">方法</th>
              <th className="text-left px-4 py-3 font-semibold">状态码</th>
              <th className="text-left px-4 py-3 font-semibold">耗时</th>
              <th className="text-left px-4 py-3 font-semibold">结果</th>
              <th className="text-left px-4 py-3 font-semibold rounded-tr-xl">错误信息</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[#EBF1F1] hover:bg-[#EAFBFA] transition-colors">
                <td className="px-4 py-3 text-xs text-[#7C8A92] whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3 text-[#16232B] font-mono font-semibold text-xs">{log.apiName}</td>
                <td className="px-4 py-3 text-[#4A5A63] text-xs">{log.method}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-mono ${log.responseStatus >= 200 && log.responseStatus < 300 ? 'text-green-600' : 'text-red-500'}`}>
                    {log.responseStatus || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#4A5A63]">{log.durationMs}ms</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${log.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {log.isSuccess ? '成功' : '失败'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-red-500">{log.errorMessage || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
