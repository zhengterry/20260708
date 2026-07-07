'use client';

import { useState } from 'react';

export default function ScanPage() {
  const [scanData, setScanData] = useState({
    waybillNo: '',
    skuCode: '',
    batchNo: '',
    qtyScanned: '',
    isDefective: false,
    defectLevel: '',
    specDeviation: '',
  });
  const [scanResult, setScanResult] = useState<{
    qcResult?: 'pass' | 'hold';
    hits?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!scanData.waybillNo || !scanData.skuCode) return;
    setLoading(true);
    // TODO: 调用 V2 接口校验 SKU 归属 + 运行品控规则引擎
    setTimeout(() => {
      // 模拟品控检测结果
      const isQtyDiff = scanData.qtyScanned && parseInt(scanData.qtyScanned) < 90;
      if (isQtyDiff || scanData.isDefective) {
        setScanResult({
          qcResult: 'hold',
          hits: [isQtyDiff ? 'QC-QTY-01: 数量差异 ≥ 5%' : '', scanData.isDefective ? 'QC-DEF-01: 破损 ≥ 3 级' : ''].filter(Boolean),
        });
      } else {
        setScanResult({ qcResult: 'pass', hits: [] });
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-[#DFE7E8]">
        <h1 className="text-2xl font-bold text-[#16232B] mb-1">扫描品控</h1>
        <p className="text-sm text-[#7C8A92]">扫描 SKU 录入品控检测，系统自动运行规则引擎判定结果</p>
      </div>

      <div className="grid grid-cols-2 gap-8 max-lg:grid-cols-1">
        {/* Scan Input */}
        <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-[#16232B] mb-5 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#0FC6C2] rounded-sm inline-block" />
            扫描录入
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#16232B] mb-1">运单号 *</label>
              <input
                type="text"
                value={scanData.waybillNo}
                onChange={(e) => setScanData({ ...scanData, waybillNo: e.target.value })}
                placeholder="WB202607010001"
                className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 focus:border-[#0FC6C2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#16232B] mb-1">SKU 编码 *</label>
              <input
                type="text"
                value={scanData.skuCode}
                onChange={(e) => setScanData({ ...scanData, skuCode: e.target.value })}
                placeholder="SKU-BT-001"
                className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 focus:border-[#0FC6C2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#16232B] mb-1">批次号</label>
              <input
                type="text"
                value={scanData.batchNo}
                onChange={(e) => setScanData({ ...scanData, batchNo: e.target.value })}
                placeholder="B20260701"
                className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 focus:border-[#0FC6C2] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#16232B] mb-1">扫描数量 *</label>
              <input
                type="number"
                value={scanData.qtyScanned}
                onChange={(e) => setScanData({ ...scanData, qtyScanned: e.target.value })}
                placeholder="0"
                className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 focus:border-[#0FC6C2] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="defective"
                checked={scanData.isDefective}
                onChange={(e) => setScanData({ ...scanData, isDefective: e.target.checked })}
                className="w-4 h-4 rounded accent-[#0FC6C2]"
              />
              <label htmlFor="defective" className="text-sm text-[#16232B]">外观破损</label>
            </div>

            {scanData.isDefective && (
              <div>
                <label className="block text-sm font-semibold text-[#16232B] mb-1">破损等级 (1-5)</label>
                <select
                  value={scanData.defectLevel}
                  onChange={(e) => setScanData({ ...scanData, defectLevel: e.target.value })}
                  className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 focus:border-[#0FC6C2] focus:outline-none"
                >
                  <option value="">请选择</option>
                  <option value="1">1 级 - 轻微</option>
                  <option value="2">2 级 - 轻度</option>
                  <option value="3">3 级 - 中度</option>
                  <option value="4">4 级 - 严重</option>
                  <option value="5">5 级 - 报废</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#16232B] mb-1">规格偏差描述</label>
              <input
                type="text"
                value={scanData.specDeviation}
                onChange={(e) => setScanData({ ...scanData, specDeviation: e.target.value })}
                placeholder="如型号不符、颜色错误等"
                className="w-full text-sm border border-[#DFE7E8] rounded-lg px-3 py-2.5 focus:border-[#0FC6C2] focus:outline-none"
              />
            </div>

            <button
              onClick={handleScan}
              disabled={loading || !scanData.waybillNo || !scanData.skuCode}
              className="w-full py-3 bg-[#0FC6C2] text-white rounded-lg font-semibold hover:bg-[#0AA6A3] disabled:opacity-50 transition-colors"
            >
              {loading ? '品控检测中...' : '提交扫描'}
            </button>
          </div>
        </div>

        {/* QC Result */}
        <div className="bg-white border border-[#DFE7E8] rounded-2xl p-6">
          <h3 className="text-sm font-bold text-[#16232B] mb-5 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#0FC6C2] rounded-sm inline-block" />
            品控结果
          </h3>

          {!scanResult ? (
            <div className="text-center py-16">
              <p className="text-sm text-[#7C8A92]">请先录入扫描信息进行品控检测</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-6 rounded-xl text-center ${scanResult.qcResult === 'pass' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-2xl font-bold ${scanResult.qcResult === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                  {scanResult.qcResult === 'pass' ? '品控通过 ✓' : '品控异常 ✗'}
                </p>
                <p className="text-sm mt-1 text-[#4A5A63]">
                  {scanResult.qcResult === 'pass' ? '可正常出库' : '货物已暂扣，批次锁定'}
                </p>
              </div>

              {scanResult.hits && scanResult.hits.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-[#16232B] mb-2">命中的规则：</p>
                  {scanResult.hits.map((hit, i) => (
                    <div key={i} className="text-sm p-2.5 bg-gray-50 rounded-lg text-[#4A5A63] mb-1">{hit}</div>
                  ))}
                </div>
              )}

              {scanResult.qcResult === 'hold' && (
                <div className="p-3 bg-[#FAEEDA] rounded-lg text-sm text-[#BA7517]">
                  <strong>提示：</strong>该批次 SKU 已进入品控暂扣状态，已完成工单自动创建（来源=扫描触发）。
                  品控主管可以在工单详情页发起"快速放行"。
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
