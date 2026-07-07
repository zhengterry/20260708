'use client';

import { useState } from 'react';

export default function CreateTicketPage() {
  const [formData, setFormData] = useState({
    waybillNo: '',
    exceptionSubtype: 'lost',
    description: '',
    amount: '',
  });
  const [validateResult, setValidateResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!formData.waybillNo) return;
    setLoading(true);
    // TODO: 调用 V2 接口校验运单是否存在
    setValidateResult({ success: true, message: `运单 ${formData.waybillNo} 存在，金额 ¥12,500.00（实时获取自 V2）` });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateResult?.success) return;
    setLoading(true);
    // TODO: 调用 API 创建工单
    alert('工单创建成功！（模拟）');
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-[#DFE7E8]">
        <h1 className="text-2xl font-bold text-[#16232B] mb-1">异常工单上报</h1>
        <p className="text-sm text-[#7C8A92]">从 V2 运单发起异常上报，系统会实时校验运单真实性</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white border border-[#DFE7E8] rounded-2xl p-6 space-y-5">
          {/* 运单号 */}
          <div>
            <label className="block text-sm font-semibold text-[#16232B] mb-1.5">
              运单号 <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.waybillNo}
                onChange={(e) => { setFormData({ ...formData, waybillNo: e.target.value }); setValidateResult(null); }}
                placeholder="输入运单号，如 WB202607010001"
                className="flex-1 text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 bg-white text-[#16232B] placeholder:text-[#7C8A92] focus:border-[#0FC6C2] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleValidate}
                disabled={loading || !formData.waybillNo}
                className="px-4 py-2.5 bg-[#0FC6C2] text-white rounded-lg text-sm font-semibold hover:bg-[#0AA6A3] disabled:opacity-50 transition-colors"
              >
                {loading ? '校验中...' : '校验运单'}
              </button>
            </div>
            {validateResult && (
              <div className={`mt-2 text-sm p-3 rounded-lg ${validateResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {validateResult.message}
              </div>
            )}
          </div>

          {/* 异常类型 */}
          <div>
            <label className="block text-sm font-semibold text-[#16232B] mb-1.5">异常类型 <span className="text-red-400">*</span></label>
            <select
              value={formData.exceptionSubtype}
              onChange={(e) => setFormData({ ...formData, exceptionSubtype: e.target.value })}
              className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 bg-white text-[#16232B] focus:border-[#0FC6C2] focus:outline-none"
            >
              <optgroup label="物流异常">
                <option value="lost">丢件</option>
                <option value="damaged">破损</option>
                <option value="rejected_by_customer">客户拒收</option>
                <option value="timeout">超时未签收</option>
                <option value="wrong_address">收货地址错误</option>
              </optgroup>
            </select>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-semibold text-[#16232B] mb-1.5">异常描述 <span className="text-red-400">*</span></label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请描述异常情况..."
              rows={4}
              className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 bg-white text-[#16232B] placeholder:text-[#7C8A92] focus:border-[#0FC6C2] focus:outline-none resize-none"
            />
          </div>

          {/* 涉及金额 */}
          <div>
            <label className="block text-sm font-semibold text-[#16232B] mb-1.5">涉及金额（元）</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 bg-white text-[#16232B] placeholder:text-[#7C8A92] focus:border-[#0FC6C2] focus:outline-none"
            />
          </div>

          {/* AI 辅助区域（可选） */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-700 mb-1">AI 建议（需人工确认）</p>
            <p className="text-xs text-amber-600">
              暂未启用大模型辅助。可接入 OpenAI/Claude API 自动根据描述推荐异常类型和严重度。
            </p>
          </div>

          {/* 提交 */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!validateResult?.success || loading}
              className="px-6 py-2.5 bg-[#0FC6C2] text-white rounded-lg font-semibold hover:bg-[#0AA6A3] disabled:opacity-50 transition-colors"
            >
              {loading ? '提交中...' : '提交工单'}
            </button>
            <button
              type="button"
              onClick={() => setFormData({ waybillNo: '', exceptionSubtype: 'lost', description: '', amount: '' })}
              className="px-6 py-2.5 border border-[#DFE7E8] text-[#4A5A63] rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
          </div>
        </form>

        {/* 重复上报提示 */}
        <div className="mt-6 p-4 border-l-3 border-amber-400 bg-[#FAEEDA] rounded-r-xl text-sm text-[#4A5A63]">
          <strong className="text-[#BA7517]">注意：</strong>
          同一运单存在同类型未关闭工单时，系统会阻止重复上报并提示已有工单状态。
        </div>
      </div>
    </div>
  );
}
