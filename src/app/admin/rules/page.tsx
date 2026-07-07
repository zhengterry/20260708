'use client';

import { useState } from 'react';

const MOCK_RULES = [
  { id: 1, ruleCode: 'QC-QTY-01', ruleName: '数量差异检测', exceptionType: 'qty_diff', conditionConfig: '数量差异 >= 5%', severity: 'minor', autoCreateTicket: true, defaultApprovalLevel: 2, isActive: true },
  { id: 2, ruleCode: 'QC-DEF-01', ruleName: '外观破损（中等以上）', exceptionType: 'defect', conditionConfig: '破损 >= 3 级', severity: 'major', autoCreateTicket: true, defaultApprovalLevel: 2, isActive: true },
  { id: 3, ruleCode: 'QC-DEF-02', ruleName: '外观破损（轻微）', exceptionType: 'defect', conditionConfig: '破损 >= 1 级', severity: 'minor', autoCreateTicket: true, defaultApprovalLevel: 1, isActive: true },
  { id: 4, ruleCode: 'QC-SPEC-01', ruleName: '规格不符检测', exceptionType: 'spec_diff', conditionConfig: '关键词: 型号,颜色,规格,尺寸', severity: 'major', autoCreateTicket: true, defaultApprovalLevel: 2, isActive: true },
  { id: 5, ruleCode: 'QC-LBL-01', ruleName: '标签错误检测', exceptionType: 'label_error', conditionConfig: '标签不可识别', severity: 'critical', autoCreateTicket: true, defaultApprovalLevel: 2, isActive: true },
  { id: 6, ruleCode: 'QC-BAT-01', ruleName: '批次异常检测', exceptionType: 'batch_error', conditionConfig: '批次号异常', severity: 'critical', autoCreateTicket: true, defaultApprovalLevel: 2, isActive: true },
];

export default function RulesPage() {
  const [rules] = useState(MOCK_RULES);

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-[#DFE7E8] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#16232B] mb-1">品控规则配置</h1>
          <p className="text-sm text-[#7C8A92]">可配置的品控触发规则，调整后即时生效，无需重启</p>
        </div>
        <button className="px-4 py-2 bg-[#0FC6C2] text-white rounded-lg text-sm font-semibold hover:bg-[#0AA6A3] transition-colors">
          + 新增规则
        </button>
      </div>

      <div className="mb-6 p-4 bg-[#EAFBFA] border-l-3 border-[#0FC6C2] rounded-r-xl text-sm text-[#4A5A63]">
        <strong className="text-[#0AA6A3]">设计说明：</strong>所有品控规则均为数据库可配置项，不硬编码。修改后即时生效。
        条件配置存储在 JSONB 字段中，支持灵活扩展新规则类型。
      </div>

      <div className="overflow-x-auto border border-[#DFE7E8] rounded-xl shadow-sm">
        <table className="w-full text-sm bg-white">
          <thead>
            <tr className="bg-[#16232B] text-white">
              <th className="text-left px-4 py-3 font-semibold rounded-tl-xl">规则编码</th>
              <th className="text-left px-4 py-3 font-semibold">规则名称</th>
              <th className="text-left px-4 py-3 font-semibold">异常类型</th>
              <th className="text-left px-4 py-3 font-semibold">触发条件</th>
              <th className="text-left px-4 py-3 font-semibold">严重度</th>
              <th className="text-left px-4 py-3 font-semibold">审批层级</th>
              <th className="text-left px-4 py-3 font-semibold">状态</th>
              <th className="text-left px-4 py-3 font-semibold rounded-tr-xl">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t border-[#EBF1F1] hover:bg-[#EAFBFA] transition-colors">
                <td className="px-4 py-3 text-[#16232B] font-mono font-semibold text-xs">{rule.ruleCode}</td>
                <td className="px-4 py-3 text-[#16232B] font-semibold">{rule.ruleName}</td>
                <td className="px-4 py-3 text-[#4A5A63] text-xs">{rule.exceptionType}</td>
                <td className="px-4 py-3 text-[#4A5A63] text-xs">{rule.conditionConfig}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    rule.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    rule.severity === 'major' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {rule.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#4A5A63] text-xs">{rule.defaultApprovalLevel} 级</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {rule.isActive ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-[#0FC6C2] hover:text-[#0AA6A3] text-xs font-semibold transition-colors">编辑</button>
                  <button className="ml-3 text-red-400 hover:text-red-500 text-xs transition-colors">禁用</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
