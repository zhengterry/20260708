'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS, SOURCE_LABELS, EXCEPTION_LABELS, STATUS_COLORS, formatDateTime, formatAmount, DIRECTION_LABELS } from '@/lib/utils';

interface TicketDetail {
  ticket: {
    id: number;
    ticketNo: string;
    waybillNo: string;
    exceptionType: string;
    exceptionSubtype: string;
    source: string;
    description: string;
    amount: string;
    severity: string;
    currentStatus: string;
    submitterId: string;
    assigneeId: string | null;
    currentLevel: number;
    rejectCount: number;
    maxRejects: number;
    version: number;
    createdAt: string;
    updatedAt: string;
    overdueAt: string | null;
  };
  approvals: Array<{
    id: number;
    approverId: string;
    approvalLevel: number;
    action: string;
    comment: string | null;
    result: string;
    createdAt: string;
  }>;
  scans: Array<{
    id: number;
    scanId: string;
    skuCode: string;
    batchNo: string | null;
    qtyScanned: number;
    qtyExpected: number | null;
    batchLocked: boolean;
    qcResult: string;
    scannedAt: string;
  }>;
  compensations: Array<{
    id: number;
    amount: string;
    direction: string;
    status: string;
    reason: string | null;
    createdAt: string;
  }>;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${id}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setMessage({ type: 'error', text: json.error || '加载失败' });
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setApproving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: data?.ticket.id,
          approverId: 'user_approver_02',
          action,
          comment: approveComment,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message });
        setApproveComment('');
        fetchDetail();
      } else {
        setMessage({ type: 'error', text: json.error || '操作失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block w-8 h-8 border-2 border-[#0FC6C2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-[#7C8A92]">工单不存在</p>
        <button onClick={() => router.push('/tickets')} className="mt-3 text-[#0FC6C2] text-sm font-semibold">返回列表</button>
      </div>
    );
  }

  const { ticket, approvals, scans, compensations } = data;
  const isOverdue = ticket.overdueAt && new Date(ticket.overdueAt) < new Date();
  const canApprove = ticket.currentStatus === 'level1_approving' || ticket.currentStatus === 'level2_approving';

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-[#DFE7E8] flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <a href="/tickets" className="text-[#7C8A92] hover:text-[#0FC6C2] transition-colors text-sm">← 返回列表</a>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.currentStatus] || ''}`}>
              {STATUS_LABELS[ticket.currentStatus] || ticket.currentStatus}
            </span>
            {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">已超时</span>}
          </div>
          <h1 className="text-2xl font-bold text-[#16232B]">{ticket.ticketNo}</h1>
          <p className="text-sm text-[#7C8A92] mt-1">
            运单号: {ticket.waybillNo} · {EXCEPTION_LABELS[ticket.exceptionSubtype] || ticket.exceptionSubtype} · 来源: {SOURCE_LABELS[ticket.source] || ticket.source}
            <span className="ml-2 text-[#0AA6A3] font-semibold">（数据库落库数据）</span>
          </p>
        </div>

        {canApprove && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('approve')}
              disabled={approving}
              className="px-5 py-2 bg-[#0FC6C2] text-white rounded-lg font-semibold hover:bg-[#0AA6A3] disabled:opacity-50 transition-colors"
            >
              {approving ? '处理中...' : '通过'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={approving}
              className="px-5 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              拒绝
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
        {/* Left */}
        <div className="col-span-2 space-y-6">
          {/* 基本信息 */}
          <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[#16232B] mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#0FC6C2] rounded-sm" />基本信息
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-[#7C8A92]">工单号</span><p className="text-[#16232B] font-semibold mt-0.5">{ticket.ticketNo}</p></div>
              <div><span className="text-[#7C8A92]">运单号</span><p className="text-[#16232B] font-semibold mt-0.5">{ticket.waybillNo}</p></div>
              <div><span className="text-[#7C8A92]">异常类型</span><p className="text-[#16232B] mt-0.5">{EXCEPTION_LABELS[ticket.exceptionSubtype] || ticket.exceptionSubtype}</p></div>
              <div><span className="text-[#7C8A92]">来源</span><p className="text-[#16232B] mt-0.5">{SOURCE_LABELS[ticket.source] || ticket.source}</p></div>
              <div><span className="text-[#7C8A92]">涉及金额</span><p className="text-[#0AA6A3] font-bold mt-0.5">{formatAmount(ticket.amount)}</p></div>
              <div><span className="text-[#7C8A92]">严重度</span><p className="text-[#16232B] mt-0.5">{ticket.severity}</p></div>
              <div className="col-span-2"><span className="text-[#7C8A92]">描述</span><p className="text-[#16232B] mt-0.5">{ticket.description || '无'}</p></div>
              <div><span className="text-[#7C8A92]">提交人</span><p className="text-[#16232B] mt-0.5">{ticket.submitterId}</p></div>
              <div><span className="text-[#7C8A92]">当前审批人</span><p className="text-[#16232B] mt-0.5">{ticket.assigneeId || '未分配'}</p></div>
              <div><span className="text-[#7C8A92]">已拒绝次数</span><p className="text-[#16232B] mt-0.5">{ticket.rejectCount} / {ticket.maxRejects}</p></div>
              <div><span className="text-[#7C8A92]">版本号</span><p className="text-[#16232B] mt-0.5">{ticket.version}</p></div>
              <div><span className="text-[#7C8A92]">创建时间</span><p className="text-[#16232B] mt-0.5">{formatDateTime(ticket.createdAt)}</p></div>
              {ticket.overdueAt && (
                <div><span className="text-[#7C8A92]">超时时间</span><p className={`mt-0.5 font-semibold ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>{formatDateTime(ticket.overdueAt)}</p></div>
              )}
            </div>
          </div>

          {/* 审批意见 */}
          {canApprove && (
            <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#16232B] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#0FC6C2] rounded-sm" />审批意见
              </h3>
              <textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="填写审批意见..."
                rows={3}
                className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 resize-none focus:border-[#0FC6C2] focus:outline-none"
              />
            </div>
          )}

          {/* 审批记录 */}
          <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[#16232B] mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#0FC6C2] rounded-sm" />审批记录
            </h3>
            {approvals.length === 0 ? (
              <p className="text-sm text-[#7C8A92]">暂无审批记录</p>
            ) : (
              <div className="space-y-3">
                {approvals.map((record, idx) => (
                  <div key={record.id} className="flex gap-4 p-3 rounded-lg bg-gray-50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0FC6C2] text-white flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#16232B]">{record.approverId}</span>
                        <span className="text-xs text-[#7C8A92]">{record.approvalLevel === 1 ? '一级' : '二级'}审批</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          record.result === 'passed' ? 'bg-green-100 text-green-700' :
                          record.result === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {record.result === 'passed' ? '通过' : record.result === 'rejected' ? '拒绝' : record.action === 'escalate' ? '升级' : record.action}
                        </span>
                      </div>
                      {record.comment && <p className="text-sm text-[#4A5A63]">{record.comment}</p>}
                      <p className="text-xs text-[#7C8A92] mt-1">{formatDateTime(record.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 扫描记录 */}
          {scans.length > 0 && (
            <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#16232B] mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#0FC6C2] rounded-sm" />关联扫描记录
              </h3>
              <div className="space-y-2">
                {scans.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-[#7C8A92] font-mono">{s.scanId}</span>
                      <span className="font-semibold text-[#16232B]">{s.skuCode}</span>
                      <span className="text-xs text-[#4A5A63]">批次 {s.batchNo || '-'}</span>
                      <span className={`text-xs ${s.qtyScanned !== s.qtyExpected ? 'text-red-500 font-semibold' : 'text-green-600'}`}>
                        {s.qtyScanned}{s.qtyExpected ? `/${s.qtyExpected}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.batchLocked ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {s.batchLocked ? '已锁定' : '已解锁'}
                      </span>
                      <span className="text-xs text-[#7C8A92]">{formatDateTime(s.scannedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Compensation */}
        <div className="space-y-6">
          <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[#16232B] mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#0FC6C2] rounded-sm" />赔付记录
            </h3>
            {compensations.length === 0 ? (
              <p className="text-sm text-[#7C8A92]">暂无赔付记录</p>
            ) : (
              compensations.map(c => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-lg text-sm mb-2">
                  <p className="text-lg font-bold text-[#0AA6A3]">{formatAmount(c.amount)}</p>
                  <p className="text-[#4A5A63] mt-1">方向: <span className="font-semibold">{DIRECTION_LABELS[c.direction] || c.direction}</span></p>
                  <p className="text-[#4A5A63]">状态: <span className="font-semibold">{c.status}</span></p>
                  {c.reason && <p className="text-[#7C8A92] text-xs mt-1">{c.reason}</p>}
                </div>
              ))
            )}
          </div>

          <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[#16232B] mb-4">工单信息</h3>
            <div className="text-xs space-y-1.5">
              <p className="text-[#7C8A92]">数据版本: <span className="text-[#16232B] font-semibold">{ticket.version}</span></p>
              <p className="text-[#7C8A92]">审批层级: <span className="text-[#16232B] font-semibold">{ticket.currentLevel} 级</span></p>
              <p className="text-[#7C8A92]">拒绝计数: <span className="text-[#16232B] font-semibold">{ticket.rejectCount}/{ticket.maxRejects}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
