'use client';

import { useState, useEffect, useCallback } from 'react';
import { STATUS_LABELS, SOURCE_LABELS, EXCEPTION_LABELS, STATUS_COLORS, formatDateTime, formatAmount } from '@/lib/utils';

interface Ticket {
  id: number;
  ticketNo: string;
  waybillNo: string;
  exceptionType: string;
  exceptionSubtype: string;
  source: string;
  currentStatus: string;
  amount: string;
  createdAt: string;
  overdueAt: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchText) params.set('search', searchText);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
        setPagination(json.pagination);
      }
    } catch {
      console.error('获取工单列表失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchText]);

  useEffect(() => { fetchTickets(1); }, [fetchTickets]);

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-[#DFE7E8]">
        <h1 className="text-2xl font-bold text-[#16232B] mb-1">工单列表</h1>
        <p className="text-sm text-[#7C8A92]">
          管理所有异常工单，支持筛选和分页（数据库共 {pagination.total} 条记录）
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-[#DFE7E8] rounded-lg px-3 py-2 bg-white text-[#16232B] focus:border-[#0FC6C2] focus:outline-none"
        >
          <option value="all">全部状态</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-[#DFE7E8] rounded-lg px-3 py-2 bg-white text-[#16232B] focus:border-[#0FC6C2] focus:outline-none"
        >
          <option value="all">全部类型</option>
          <option value="qc">品控异常</option>
          <option value="logistics">物流异常</option>
        </select>

        <input
          type="text"
          placeholder="搜索运单号 / 工单号..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 min-w-[200px] text-sm border border-[#DFE7E8] rounded-lg px-3 py-2 bg-white text-[#16232B] placeholder:text-[#7C8A92] focus:border-[#0FC6C2] focus:outline-none"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-[#0FC6C2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-[#DFE7E8] rounded-xl shadow-sm">
            <table className="w-full text-sm bg-white">
              <thead>
                <tr className="bg-[#16232B] text-white">
                  <th className="text-left px-4 py-3 font-semibold rounded-tl-xl">工单号</th>
                  <th className="text-left px-4 py-3 font-semibold">运单号</th>
                  <th className="text-left px-4 py-3 font-semibold">异常类型</th>
                  <th className="text-left px-4 py-3 font-semibold">来源</th>
                  <th className="text-left px-4 py-3 font-semibold">金额</th>
                  <th className="text-left px-4 py-3 font-semibold">状态</th>
                  <th className="text-left px-4 py-3 font-semibold">提交时间</th>
                  <th className="text-left px-4 py-3 font-semibold rounded-tr-xl">操作</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-[#EBF1F1] hover:bg-[#EAFBFA] transition-colors">
                    <td className="px-4 py-3 text-[#16232B] font-semibold whitespace-nowrap">
                      <a href={`/tickets/${ticket.id}`} className="hover:text-[#0FC6C2] transition-colors">
                        {ticket.ticketNo}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[#4A5A63]">{ticket.waybillNo}</td>
                    <td className="px-4 py-3 text-[#4A5A63]">
                      <span className="text-xs">{EXCEPTION_LABELS[ticket.exceptionSubtype] || ticket.exceptionSubtype}</span>
                    </td>
                    <td className="px-4 py-3 text-[#4A5A63]">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ticket.source === 'scan_trigger' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>
                        {SOURCE_LABELS[ticket.source] || ticket.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#0AA6A3] font-semibold">{formatAmount(ticket.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.currentStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[ticket.currentStatus] || ticket.currentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#7C8A92] text-xs">{formatDateTime(ticket.createdAt)}</td>
                    <td className="px-4 py-3">
                      <a href={`/tickets/${ticket.id}`} className="text-[#0FC6C2] hover:text-[#0AA6A3] text-xs font-semibold transition-colors">
                        详情
                      </a>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[#7C8A92]">暂无数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-5 text-sm text-[#7C8A92]">
            <span>共 {pagination.total} 条，第 {pagination.page}/{pagination.totalPages} 页</span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchTickets(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 border border-[#DFE7E8] rounded-lg hover:border-[#0FC6C2] disabled:opacity-50 transition-colors"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => fetchTickets(p)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${p === pagination.page ? 'bg-[#0FC6C2] text-white' : 'border border-[#DFE7E8] hover:border-[#0FC6C2]'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => fetchTickets(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 border border-[#DFE7E8] rounded-lg hover:border-[#0FC6C2] disabled:opacity-50 transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
