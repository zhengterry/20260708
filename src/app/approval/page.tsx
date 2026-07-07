'use client';

import { useState, useEffect, useCallback } from 'react';
import { STATUS_LABELS, SOURCE_LABELS, EXCEPTION_LABELS, formatDateTime, formatAmount, STATUS_COLORS } from '@/lib/utils';

interface Ticket {
  id: number;
  ticketNo: string;
  waybillNo: string;
  exceptionType: string;
  exceptionSubtype: string;
  source: string;
  amount: string;
  currentStatus: string;
  overdueAt: string | null;
  createdAt: string;
}

export default function ApprovalPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets?status=level1_approving&status=level2_approving&pageSize=100');
      const json = await res.json();
      if (json.success) {
        // 需要单独获取一级和二级审批中的工单
        const res1 = await fetch('/api/tickets?status=level1_approving&pageSize=100');
        const res2 = await fetch('/api/tickets?status=level2_approving&pageSize=100');
        const j1 = await res1.json();
        const j2 = await res2.json();
        const all = [...(j1.data || []), ...(j2.data || [])];
        setTickets(all);
      }
    } catch {
      setMessage({ type: 'error', text: '加载工单失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleAction = async (ticketId: number, action: 'approve' | 'reject') => {
    setApproving(ticketId);
    setMessage(null);
    try {
      const res = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          approverId: 'user_approver_02', // 当前登录用户
          action,
          comment: comments[ticketId] || '',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message });
        setTickets(prev => prev.filter(t => t.id !== ticketId));
      } else {
        setMessage({ type: 'error', text: json.error || '操作失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setApproving(null);
    }
  };

  const updateComment = (ticketId: number, value: string) => {
    setComments(prev => ({ ...prev, [ticketId]: value }));
  };

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-[#DFE7E8]">
        <h1 className="text-2xl font-bold text-[#16232B] mb-1">审批管理</h1>
        <p className="text-sm text-[#7C8A92]">查看和处理待您审批的工单（数据实时取自数据库）</p>
      </div>

      {/* 操作提示 */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-8 h-8 border-2 border-[#0FC6C2] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#7C8A92] mt-3">加载中...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#DFE7E8] rounded-2xl">
          <p className="text-[#7C8A92] text-sm">暂无待审批工单</p>
          <button
            onClick={fetchApprovals}
            className="mt-3 text-[#0FC6C2] text-sm font-semibold hover:text-[#0AA6A3]"
          >
            刷新列表
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const isOverdue = ticket.overdueAt && new Date(ticket.overdueAt) < new Date();
            return (
              <div
                key={ticket.id}
                className={`relative bg-white border rounded-2xl p-5 hover:shadow-sm transition-shadow ${isOverdue ? 'border-red-300 bg-red-50/30' : 'border-[#DFE7E8]'}`}
              >
                {isOverdue && (
                  <span className="absolute -top-2.5 -right-2.5 px-2.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold animate-pulse">
                    已超时
                  </span>
                )}

                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <a href={`/tickets/${ticket.id}`} className="text-lg font-bold text-[#16232B] hover:text-[#0FC6C2] transition-colors truncate">
                        {ticket.ticketNo}
                      </a>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[ticket.currentStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[ticket.currentStatus] || ticket.currentStatus}
                      </span>
                      <span className="text-xs text-[#7C8A92] flex-shrink-0">{SOURCE_LABELS[ticket.source] || ticket.source}</span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span className="text-[#4A5A63]">运单: <strong>{ticket.waybillNo}</strong></span>
                      <span className="text-[#4A5A63]">类型: {EXCEPTION_LABELS[ticket.exceptionSubtype] || ticket.exceptionSubtype}</span>
                      <span className="text-[#0AA6A3] font-bold">{formatAmount(ticket.amount)}</span>
                      <span className="text-[#7C8A92] text-xs">{formatDateTime(ticket.createdAt)}</span>
                      {ticket.overdueAt && (
                        <span className={`text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                          超时: {formatDateTime(ticket.overdueAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAction(ticket.id, 'approve')}
                      disabled={approving === ticket.id}
                      className="px-5 py-2 bg-[#0FC6C2] text-white rounded-lg text-sm font-semibold hover:bg-[#0AA6A3] disabled:opacity-50 transition-colors"
                    >
                      {approving === ticket.id ? '处理中...' : '审批通过'}
                    </button>
                    <button
                      onClick={() => handleAction(ticket.id, 'reject')}
                      disabled={approving === ticket.id}
                      className="px-5 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      拒绝
                    </button>
                  </div>
                </div>

                {/* 审批意见 */}
                <div className="mt-3 pt-3 border-t border-[#EBF1F1]">
                  <textarea
                    placeholder="填写审批意见（可选）..."
                    rows={2}
                    value={comments[ticket.id] || ''}
                    onChange={(e) => updateComment(ticket.id, e.target.value)}
                    className="w-full text-sm border border-[#EBF1F1] rounded-lg px-3 py-2 resize-none focus:border-[#0FC6C2] focus:outline-none bg-white"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 刷新按钮 */}
      {tickets.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={fetchApprovals}
            className="text-sm text-[#0FC6C2] hover:text-[#0AA6A3] font-semibold transition-colors"
          >
            刷新列表
          </button>
        </div>
      )}
    </div>
  );
}
